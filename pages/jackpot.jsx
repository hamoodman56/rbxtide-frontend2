import { createEffect, createSignal, onMount, For } from "solid-js";
import { useWebsocket } from "../contexts/socketprovider";
import { useUser } from "../contexts/usercontextprovider";
import Countup from "../components/Countup/countup";
import JackpotUser from "../components/Jackpot/jackpotuser";
import JackpotBet from "../components/Jackpot/jackpotbet";
import JackpotBox from "../components/Jackpot/jackpotbox";
import JackpotJoin from "../components/Jackpot/jackpotjoin";
import Level from "../components/Level/level";
import { getCents } from "../util/balance";
import { subscribeToGame, unsubscribeFromGames } from "../util/socket";
import { Meta, Title } from "@solidjs/meta";
import { Doughnut } from "solid-chartjs";
import { useSearchParams } from "@solidjs/router";

function Jackpot(props) {
  let spinnerRef;
  let audioRef = null;

  const [ws] = useWebsocket();
  const [user] = useUser();

  const [jackpot, setJackpot] = createSignal(null);
  const [bets, setBets] = createSignal([]);
  const [rawBets, setRawBets] = createSignal([]);
  const [total, setTotal] = createSignal(0);
  const [join, setJoin] = createSignal(false);
  const [timer, setTimer] = createSignal(-1);
  const [state, setState] = createSignal("waiting");
  const [config, setConfig] = createSignal({});
  const [users, setUsers] = createSignal([]);
  const [winner, setWinner] = createSignal(null);
  const [angle, setAngle] = createSignal(null);
  const [serverSeed, setServerSeed] = createSignal(null);
  const [ticket, setTicket] = createSignal(0);
  const [isPlaying, setIsPlaying] = createSignal(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [chartData, setChartData] = createSignal({
    labels: [],
    datasets: [
      {
        data: [],
        borderWidth: 10,
        rotation: 0,
      },
    ],
  });

  const [chartOptions, setChartOptions] = createSignal({
    legend: {
      display: false,
    },
    title: {
      display: false,
    },
    tooltips: { enabled: false },
    hover: { mode: null },
    responsive: true,
    maintainAspectRatio: false,
    aspectRatio: 1,
    cutout: 160,
    circumference: 360,
    borderRadius: 10,
    spacing: 15,
    elements: {
      arc: {
        borderColor: "transparent",
      },
    },
    animation: {
      duration: 1500,
    },
  });

  let hasConnected = false;

  const spinnerContent = {
    winners: () => (
      <>
        <div className="winner fadein">
          <div>
            <div class="userImage">
              <img
                src={`${import.meta.env.VITE_SERVER_URL}/user/${
                  winner()?.user?.id
                }/img`}
                height="52"
                width="52"
              />
            </div>
            <p className="details">
              <span className="white bold">{winner()?.user?.username}</span>
              <span class="wonText">won</span>
              <img src="/assets/icons/coin.svg" height="17" width="17" />
              <span className="bold white">
                {total()?.toLocaleString(undefined, {
                  maximumFractionDigits: 0,
                })}
                <span className="gray">.{getCents(total())}</span>
              </span>
              {/* with {((winner()?.amount / total()) * 100)?.toFixed(0)}% */}
            </p>
          </div>
        </div>
      </>
    ),
    rolling: () => (
      <>
        <img
          className="arrow"
          src="/assets/icons/selector.png"
          height="16"
          alt=""
        />
        <div className="spinner" ref={spinnerRef}>
          <For each={users()}>
            {(bet, index) => (
              <JackpotUser
                color={bet?.color}
                id={bet?.user?.id}
                percent={bet?.amount / total()}
                state={state()}
                index={index()}
              />
            )}
          </For>
        </div>
      </>
    ),
    counting: () => (
      <div class="timer">
        <span>
          <img src="/assets/icons/jp-timer.svg" height="18" width="15" />
          in {Math.floor(timer() / 1000) + " s"}
        </span>
      </div>
    ),
    waiting: () => <></>,
  };

  createEffect(() => {
    if (ws() && ws().connected && !hasConnected) {
      unsubscribeFromGames(ws());
      subscribeToGame(ws(), "jackpot");

      ws().off("jackpot:set");
      ws().off("jackpot:bets");
      ws().off("jackpot:on");
      ws().off("jackpot:new");
      ws().off("jackpot:countStart");
      ws().off("jackpot:roll");

      ws().on("jackpot:set", (jp) => {
        congregateBets(jp?.bets);
        setJackpot(jp);
        setConfig(jp?.config);
        setRawBets(jp.bets);
        setServerSeed(jp.round.serverSeed);

        if (jp.round.countStartedAt) {
          let countStart = new Date(jp.round.countStartedAt).getTime();
          let serverTime = new Date(jp.serverTime).getTime();
          let timeSince = serverTime - countStart;

          if (timeSince < 30000) {
            let timeLeft = 30000 - timeSince;
            let ends = Date.now() + timeLeft;
            let duration = ends < 1000 ? ends : 1000;

            setTimer(timeLeft);
            setState("counting");
            let int = setInterval(() => {
              setTimer(Math.max(0, ends - Date.now()));
              if (Date.now() > ends) return clearInterval(int);
            }, duration);
          }
        }
      });

      ws().on("jackpot:new", (jp) => {
        setTimer(-1);
        setTotal(0);
        setBets([]);
        setJackpot(jp);
        setUsers([]);
        setRawBets([]);
        setState("waiting");
        setWinner(null);
        setTicket(0);
      });

      ws().on("jackpot:bets", (bets) => {
        let newJP = { ...jackpot() };

        if (!Array.isArray(newJP.bets)) newJP.bets = [];
        newJP.bets.push(...bets);

        congregateBets(newJP.bets);
        setJackpot(newJP);
        setRawBets((b) => [...b, ...bets]);
      });

      ws().on("jackpot:countStart", () => {
        let ends = Date.now() + config()?.betTime;
        setState("counting");
        setTimer(30000);

        let int = setInterval(() => {
          setTimer(Math.max(0, ends - Date.now()));
          if (Date.now() > ends) return clearInterval(int);
        }, 1000);
      });

      ws().on(
        "jackpot:roll",
        (roundId, unhashedServerSeed, clientSeed, winnerBetId, ticket) => {
          if (state() === "rolling") return;

          setTicket(ticket);
          //  let winningBet = rawBets().find((bet) => bet.id === winnerBetId);
          let congregatedBet = bets().find(
            (bet) => bet.user.id === winnerBetId
          );

          const rAngle = calculateAngle(chartData(), congregatedBet.color);
          const rotationAngle = 360 * 5 - rAngle;

          // console.log("ANGLE", rotationAngle, congregatedBet.color);

          setWinner(congregatedBet);
          setAngle(parseInt(rotationAngle));

          setJackpot({ ...jackpot(), serverSeed: unhashedServerSeed });
          setIsPlaying(true);
          setState("rolling");
          setTimer(5);

          setTimeout(() => {
            setIsPlaying(false);
          }, 2200);

          setTimeout(() => {
            setState("winners");
          }, 8000);

          setTimeout(() => {
            setChartData({
              labels: ["No bets"],
              datasets: [
                {
                  data: [1],
                  backgroundColor: [defaultColor],
                  borderWidth: 10,
                  rotation: 0,
                },
              ],
            });
          }, 12000);
          //  rollAnimation(jackpot());
        }
      );

      hasConnected = true;
    }

    hasConnected = !!ws()?.connected;
  });

  function usersBet() {
    if (!user()) return;
    return bets()?.find((bet) => bet.user.id === user().id);
  }

  const defaultColor = "#262c52";
  const colors = [
    "#FF3838",
    "#38FF4C",
    "#FFAF38",
    "#3858FF",
    "#A738FF",
    "#42DAF5",
    "#FF6EE7",
    "#FF8629",
  ];

  /* 
   const calculateAngle = (data, targetColor) => {
    const dataset = data.datasets[0];
    const total = dataset.data.reduce((acc, value) => acc + value, 0);
    const backgroundColors = dataset.backgroundColor;
    
    const targetIndex = backgroundColors.indexOf(targetColor);
  
    const targetValue = dataset.data[targetIndex];
    const proportion = total / targetValue;
    const angle = proportion * 360 + 3600; 
  
    return angle;
  };
  */

  const calculateAngle = (data, targetColor) => {
    const dataset = data.datasets[0];
    const total = dataset.data.reduce((acc, value) => acc + value, 0);
    const backgroundColors = dataset.backgroundColor;

    const targetIndex = backgroundColors.indexOf(targetColor);

    if (targetIndex === -1) {
      return null;
    }

    // Calculate the start angle of the target segment
    let startAngle = 0;
    for (let i = 0; i < targetIndex; i++) {
      startAngle += (dataset.data[i] / total) * 360;
    }

    // Calculate the middle of the target segment
    const targetValue = dataset.data[targetIndex];
    const angle = startAngle + (targetValue / total) * 180; // Middle of the segment

    return angle;
  };

  //console.log(calculateAngle(chartData(), "FF3838"));

  // const rotationAngles = calculateRotationAngles(chartData());

  function congregateBets(bets) {
    let total = 0;
    let combinedUserBets = [];
    let color = 0;
    bets.forEach((bet) => {
      const userId = bet.user.id;
      const existingUserBetIndex = combinedUserBets.findIndex(
        (userBet) => userBet.user.id === userId
      );

      let totalValue = 0;

      if (bets.length > 0) {
        totalValue = bet.items.reduce((acc, item) => acc + item.value, 0);
      } else {
        totalValue = 0;
      }

      if (existingUserBetIndex !== -1) {
        combinedUserBets[existingUserBetIndex].amount += totalValue;
      } else {
        combinedUserBets.push({
          user: bet.user,
          amount: totalValue,
          color: colors[combinedUserBets.length % colors.length],
          items: bet.items,
        });

        color++;

        const newData = combinedUserBets.map((userBet) => userBet.amount);
        const newLabels = combinedUserBets.map((userBet) => userBet.user.name);

        setChartData({
          labels: newLabels,
          datasets: [
            {
              data: newData,
              backgroundColor: combinedUserBets.map(
                (userBet) => userBet.color || defaultColor
              ),
              borderWidth: 10,
              rotation: 0,
            },
          ],
        });

        setChartOptions((options) => ({
          ...options,
          borderRadius: 0,
          spacing: 0,
        }));
      }

      total += totalValue;
    });

    if (state() == "waiting" && bets.length === 0) {
      setChartData({
        labels: ["No bets"],
        datasets: [
          {
            data: [1],
            backgroundColor: [defaultColor],
            borderWidth: 10,
            rotation: 0,
          },
        ],
      });

      setChartOptions((options) => ({
        ...options,
        borderRadius: 0,
        spacing: 0,
      }));
      // reset chart data
    }

    setTotal(total);
    setBets(combinedUserBets);
  }

  const styles = `
  .spin-wheel {
    transition: 6s cubic-bezier(0, 0.44, 0.385, 1) spin forwards;
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }
    to {
      transform: rotate(var(--rotation-angle));
    }
  }
`;

  document.head.insertAdjacentHTML("beforeend", `<style>${styles}</style>`);

  if (state() == "waiting" && bets().length === 0) {
    setChartData({
      labels: ["No bets"],
      datasets: [
        {
          data: [1],
          backgroundColor: [defaultColor],
          borderWidth: 10,
          rotation: 0,
        },
      ],
    });

    setChartOptions((options) => ({
      ...options,
      borderRadius: 0,
      spacing: 0,
    }));
  }

  createEffect(() => {
    if (isPlaying() && audioRef.paused) {
      audioRef.playbackRate = 0.8;
      audioRef.play().catch((error) => {
        console.error("Failed to play audio:", error);
      });
    } else if (!isPlaying() && !audioRef.paused) {
      audioRef.pause();
      audioRef.currentTime = 0;
    }
  });

  return (
    <>
      <Title>RBTide | The leading in-game wagering site - Jackpot</Title>
      <Meta name="title" content="Jackpot"></Meta>
      <Meta
        name="description"
        content="Flip Items On RBXTide, Win Conflips, Earn And Trade Items!"
      ></Meta>

      {join() && <JackpotJoin close={() => setJoin(false)} />}

      <div className="jackpot-container fadein">
        <div className="stats">
          <div className="stat">
            <p>
              {(((usersBet()?.amount || 0) / (total() || 1)) * 100).toFixed(2)}%
            </p>
            <p>YOUR CHANCE</p>
          </div>

          <div className="stat">
            <p>{bets()?.length}</p>
            <p>TOTAL PLAYERS</p>
          </div>

          <div className="stat">
            <p className="white align">
              <img
                className="stat-coin"
                src="/assets/icons/coin.svg"
                height="21"
                width="21"
                alt=""
              />
              <Countup end={total()} gray={true} />
            </p>

            <p className="gold">TOTAL ITEMS</p>
          </div>
        </div>

        {/*
        <div className="timer-container">
          <div className="timer" ref={timerBar} />
          <p>{timerText[state()]}</p>
        </div>
        */}

        <div className="jackpot">
          <div>
            {state() === "waiting" || state() === "counting" ? (
              <>
                <button
                  className="button-blue join"
                  onClick={() => {
                    if (user()) {
                      setJoin(true);
                    } else {
                      setSearchParams({ modal: "login" });
                    }
                  }}
                  disabled={usersBet()?.amount ? true : false}
                >
                  {state() === "rolling" ? (
                    <span>ROLLING</span>
                  ) : usersBet()?.amount ? (
                    <span>JOINED</span>
                  ) : (
                    <span>JOIN</span>
                  )}
                </button>
              </>
            ) : null}
          </div>
          <div className="jackpotWheel">
            <div className="">
              {/* 
           className="poiner" 

           <img
              src="/assets/icons/pointer.svg"
              height="40"
              width="25"
              alt=""
            />
            */}
            </div>
            <div className="jackpotInfo">
              {(state() == "waiting" ||
                state() == "counting" ||
                state() == "rolling") && <p className="totalPot">Total Pot:</p>}
              <div className="totalAmount">
                {" "}
                {(state() == "waiting" ||
                  state() == "counting" ||
                  state() == "rolling") && (
                  <>
                    <img
                      src="/assets/icons/coin.svg"
                      height="45"
                      width="45"
                      alt=""
                    />
                    <Countup end={total()} gray={true} />
                  </>
                )}
                <div>{spinnerContent[state()]}</div>
              </div>
            </div>
            <div
              className={state() === "rolling" ? "spin-wheel" : ""}
              style={{
                animation:
                  state() === "rolling"
                    ? `spin 6s cubic-bezier(0.68, -0.55, 0.27, 1.55) forwards`
                    : "none",
                "--rotation-angle": `${angle()}deg`,
              }}
            >
              <div className="wheel">
                <Doughnut
                  cx="50%"
                  cy="50%"
                  data={chartData()}
                  options={chartOptions()}
                />
                <audio
                  ref={audioRef}
                  src="/assets/sounds/jackpot.roll.mp3"
                  loop
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="infoBoxes">
        {bets()
          .sort((a, b) => b.items.length - a.items.length)
          .map((bet, index) => (
            <>
              <JackpotBox
                key={index}
                bet={bet}
                color={bet.color}
                total={total()}
              />
            </>
          ))}

        {serverSeed() && (
          <>
            <span className="serverSeed">Hash: {serverSeed()}</span>
            <div className="bets">
              <div className="strikeLike"></div>
              {state() !== "waiting" ||
                (bets().length > 0 && (
                  <>
                    <p className="currentPot">CURRENT POT</p>
                  </>
                ))}
              <div className="strikeLike"></div>
            </div>

            {bets().length !== 0 && (
              <div className="betDisplay scrollable">
                {bets().map((bet, index) =>
                  bet.items.map((item, itemIndex) => (
                    <div className="betRow" key={`${index}-${itemIndex}`}>
                      <JackpotBet
                        item={item}
                        user={bet.user.id}
                        color={bet.color}
                      />
                    </div>
                  ))
                )}
              </div>
            )}
          </>
        )}
      </div>

      <style jsx>
        {`
        .jackpot {
          display: flex;
          justify-content: center;
          position: absolute;
          margin-top: 25px;
          float: left;
          left: 20%;
        }

        .jackpotWheel {
          z-index: 1;
          background: #1d2240;
          border-radius: 50%;
          width: 500px;
          background: transparent;
          display: flex;
          justify-content: center;
          align-items: center;
          user-select: none;
          transform-origin: center;
          position: absolute;
        }

        .wheel {
          width: 100%;
        }

        .pointer {
          position: absolute;
          top: 3%;
          left: 50%;
          transform: translate(-50%, -50%);
          z-index: 20; 
        }

        .jackpotWheel::after {
          content: "";
          width: 48px;
          height: 50px;
          top: 13%;
          position: absolute;
          background: #13172c;
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
        }

        .jackpotWheel::before {
          content: "";
          position: absolute;
          clip-path: polygon(50% 0%, 0% 100%, 100% 100%);
          background: #13172c;
          top: -15px;
          width: 0;
          height: 0;
          z-index: 15;
        }

        .jackpotInfo {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .totalPot {
          color: #fff;
          font-size: 25px;
          margin-top: -50px;
          margin-bottom: 10px;
        }

        .totalAmount {
          display: flex;
          color: #fff;
          font-size: 40px;
          gap: 5px;
        }

 

        .spin-wheel {
    animation: 6s spin cubic-bezier(0, 0.44, 0.385, 1) forwards;
  }

  @keyframes spin {
  0% {
    transform: rotate(0deg) scale(1);
  }
  20% {
    transform: rotate(calc(var(--rotation-angle) / 5)) scale(1.05);
  }
  40% {
    transform: rotate(calc(var(--rotation-angle) / 2.5)) scale(1.1);
  }
  60% {
    transform: rotate(calc(var(--rotation-angle) / 1.66)) scale(1.15);
  }
  80% {
    transform: rotate(calc(var(--rotation-angle) * 0.8)) scale(1.1);
  }
  100% {
    transform: rotate(var(--rotation-angle)) scale(1);
  }
}
       
        .infoBoxes {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-left: 100px;
  float: right;
  margin-right: 200px;
  }

        .jackpot-container {
          width: 100%;
          max-width: 1175px;
          height: fit-content;

          box-sizing: border-box;
          padding: 30px 0;
          margin: 0 auto;
        }

        .jackpot-header {
          display: flex;
          justify-content: space-between;
        }

        .header-section {
          display: flex;
          align-items: center;
          flex-grow: 1;
          gap: 15px;
        }

        .right {
          justify-content: flex-end;
        }

        .title {
          color: #fff;
          font-size: 18px;
          font-weight: 700;

          display: flex;
          align-items: center;
          gap: 8px;
        }

        .currentPot {
          color: #0077DB;
          font-weight: 600;
          font-family: Clash Display, sans-serif;
          font-size: 20px;
        }

   
.iconLuck {
  display: flex;
  justify-content: center;
  align-items: center;
  width: 22px; /* Adjust width */
  height: 22px; /* Adjust height */
}


        .join {
          width: 130px;
          height: 35px;
          top: 560%;
        }

        .bar {
          margin: 25px 0;
          border-radius: 555px;
          background: #5a5499;
          height: 1px;
          flex: 1;
        }

        .stats {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          width: 100%;
          margin-bottom: 20px;
        }

        .stat {
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;

          flex: 1 1 0;
          height: 90px;
          background: #151a33;

          border-radius: 10px;
          gap: 10px;

          color: #fff;
          font-family: Montserrat, sans-serif;
          font-size: 20px;
          font-weight: 600;

          padding: 10px;
          white-space: nowrap;
          position: relative;
        }

        .stat p:last-child {
          color: #8a8c99;
          font-size: 13px;
          font-weight: 600;
        }

        .align {
          display: flex;
          align-items: center;
        }

        .stat-coin {
          margin-right: 8px;
        }

        .timer-container {
          width: 100%;
          height: 35px;

          border-radius: 5px;
          border: 1px dashed #534e8f;
          background: linear-gradient(
              0deg,
              rgba(0, 0, 0, 0.2) 0%,
              rgba(0, 0, 0, 0.2) 100%
            ),
            linear-gradient(
              230deg,
              rgba(26, 14, 51, 0.35) 0%,
              rgba(66, 60, 122, 0.35) 100%
            );

          margin: 25px 0;
          position: relative;
          padding: 10px;
        }


        .users {
          width: 100%;
          height: 100px;

          display: flex;
          justify-content: center;
          align-items: center;
          position: relative;

          border-radius: 5px;
          background: linear-gradient(
            to right,
            rgba(0, 0, 0, 0.41) 0%,
            rgba(0, 0, 0, 0.15) 25%,
            rgba(0, 0, 0, 0.15) 75%,
            rgba(0, 0, 0, 0.41) 100%
          );
          padding: 10px;

          display: flex;
          gap: 8px;

          overflow: hidden;
        }

        .winner {
          display: flex;
          align-items: center;
          width: 100%;
          max-width: 650px;
        }

        .details {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 5px;
  font-size: 13px;
}

.details img {
  margin: 0 2px;
}

.details .bold.white {
  display: flex;
  align-items: center;
}

.details .gray {
  font-size: 0.8em;
  margin-left: 2px;
}

.wonText {
  color: #8A8C99;
  font-size: 12px;
}

        .ticket {
          margin-top: 10px;

          color: #ada3ef;
          font-size: 11px;
          font-weight: 600;
        }

        .spinner {
          display: flex;
          gap: 8px;

          position: absolute;
          left: 50%;
        }

        .arrow {
          position: absolute;
          top: -8px;
        }

        .bets {
  display: flex;
  justify-content: center; 
  gap: 20px; 
  margin-top: 15px; 
  position: relative; 
  flex-wrap: wrap;
  float: right;
}

.betDisplay {
  display: flex;
  flex-direction: row;
  gap: 20px;
  margin-top: 20px;
  overflow-x: auto;
  overflow-y: hidden;
  white-space: nowrap;
  max-width: 600px; 
  background-color: #0f1328; 
}

.scrollable {
  max-height: 400px;
  width: 100%;
  padding: 10px;
  border-radius: 15px;
  overflow: auto;
  overflow-x: visible; 
}

.betDisplay::-webkit-scrollbar {
  height: 0px;
}


.betRow {
  display: inline-block;
  vertical-align: top;
  width: 150px;
  flex-shrink: 0;
  margin-right: 20px; /
  margin-bottom: 0; 
}

.serverSeed {
   color: #888a95;
   font-size: 13px;
   text-align: center;
}

.timer {
  position: absolute;
  left: 50%;
  top: 120px;
  transform: translate(-50%, -50%);
  display: flex;
  justify-content: center;
  align-items: center;
  width: 111px; 
  height: 38px;
  background: #262c52;
  border-radius: 10px;
  color: white;
  font-size: 14px;
  text-align: center;
}

.timer span {
  display: flex;
  align-items: center;
}

.timer img {
  margin-right: 5px;
}


      .button-blue {
         outline: unset;
         border: unset;

         font-family: "Montserrat", sans-serif;
         color: white;
         font-weight: 500;
         font-size: 13px
         cursor: pointer;

         background: linear-gradient(#1A60E7, #1A60E7) padding-box, linear-gradient(to bottom, #4098FF, #2C79EE) border-box;
         background-blend-mode: overlay, normal;
         box-shadow: 0 0 31px #8b75ff2e;
         border: 1px solid transparent;
         border-radius: 5px;
         transition: background-color .3s;
         z-index: 2;
        }

      .join {
        width: 130px;
        height: 40px;
        margin-top: 10px;
        position: relative;
        font-size: 14px;
      }

      .userImage {
        display: flex;
        position: absolute;
        top: -215%;
        left: 50%;
        transform: translate(-50%, -50%);
      }

      @media screen and (max-width: 1880px) {
      }

      @media screen and (max-width: 1400px) {
        .betDisplay {
          margin-left: 35%
          max-width: 400px;
        }

        .bets {
          left: 30%;
        }

        .serverSeed {
          margin-left: 30%;
          font-size: 11px;
           width: 100%;
        }
      }


      @media only screen and (max-width: 1000px) {
        .jackpot-container {
          padding-bottom: 90px;
       }

       .infoBoxes {
           margin-left: 30%;
           margin-right:  0;
           float: right;
        }

        .serverSeed {
          max-width: 100%; 
          display: inline-block;
          padding: 0 5px; 
          font-size: 10px
        }

        .betDisplay {
          width: 400px;
        }
      }

       @media screen and (max-width: 513px) {
          .jackpot {
            float: 0;
            left: 35%;
            height: 150px;
          }

          .currentPot {
            display: none;
          }

          .iconLuck {
            display: none;
          }
  
         .betDisplay {
            margin-top: 500px;
            width: 360px;
            height: 300px;
          }

          
        .join {
          width: 130px;
          height: 35px;
          top: 200%;
        }

        .serverSeed {
          display: none;
        }

        }
      `}
      </style>
    </>
  );
}

export default Jackpot;
