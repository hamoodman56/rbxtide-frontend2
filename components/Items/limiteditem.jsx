function LimitedItem(props) {
  function getRarity(price, game) {
    if (game === "MM2" || game === "mm2") {
      if (price < 20) {
        return "gray";
      } else if (price < 100) {
        return "blue-col";
      } else if (price < 500) {
        return "pink";
      } else if (price < 1000) {
        return "red";
      } else if (price < 10000) {
        return "gold";
      }
      return "gold";
    } else if (game === "DAHOOD" || game === "dahood") {
      if (price < 2500) {
        return "gray";
      } else if (price < 10000) {
        return "blue-col";
      } else if (price < 50000) {
        return "pink";
      } else if (price < 150000) {
        return "red";
      } else if (price < 5000000) {
        return "gold";
      }
      return "gold";
    } else {
      if (price < 100000) {
        return "gray";
      } else if (price < 300000) {
        return "blue-col";
      } else if (price < 500000) {
        return "pink";
      } else if (price < 1000000) {
        return "red";
      } else if (price < 10000000) {
        return "gold";
      }
      return "gold";
    }
  }

  return (
    <>
      <div
        class={"limited-item-container " + (props?.active ? "active" : "")}
        onClick={props?.click}
      >
        <p className="name">{props?.name || "Unknown Item"}</p>

        <div
          class={"item-content " + getRarity(props?.value || 0, props?.game)}
        >
          {props?.isOnHold && (
            <img
              src="/assets/icons/held.svg"
              height="12"
              width="12"
              className="held"
            />
          )}

          <img
            src={props.img}
            height={props?.game.toLowerCase() === "dahood" ? "50" : "75"}
            alt=""
            draggable={false}
          />
        </div>

        <div class="horz">
          <img src="/assets/icons/coin.svg" height="12" alt="" />
          <p>
            {props?.value?.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }) || "0.00"}
          </p>
        </div>
      </div>

      <style jsx>{`
        .limited-item-container {
          min-height: 170px;
          height: 150px;

          min-width: 225px;

          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          gap: 10px;

          border-radius: 8px;
          z-index: 0;
          padding: 12px;

          border: 1px solid #524c93;
          background: linear-gradient(
            189.05deg,
            rgba(67, 64, 120, 0.25) -7.68%,
            rgba(55, 47, 104, 0.25) 97.28%
          );
          box-shadow: 0px 2px 15px 0px rgba(0, 0, 0, 0.1);

          cursor: pointer;
          transition: all 0.2s;
          user-select: none;
        }

        .held {
          position: absolute;
          top: 6px;
          right: 6px;
        }

        .active {
          border: 1px solid #30fc1e;
          background: rgba(76, 248, 93, 0.25);
          box-shadow: 0px 2px 15px 0px rgba(0, 0, 0, 0.1);
        }

        .active .name {
          color: white;
        }

        .gray {
          background: linear-gradient(
            45deg,
            rgba(169, 181, 210, 1),
            rgba(169, 181, 210, 0) 70%
          );
        }

        .blue-col {
          background: linear-gradient(
            45deg,
            rgba(0, 119, 219),
            rgba(0, 119, 219, 0) 70%
          );
        }

        .blue {
          background: linear-gradient(
            45deg,
            rgba(65, 118, 255, 1),
            rgba(65, 118, 255, 0) 70%
          );
        }

        .pink {
          background: linear-gradient(
            45deg,
            rgba(220, 95, 222, 1),
            rgba(220, 95, 222, 0) 70%
          );
        }

        .red {
          background: linear-gradient(
            45deg,
            rgba(255, 81, 65, 1),
            rgba(255, 81, 65, 0) 70%
          );
        }

        .gold {
          background: linear-gradient(
            45deg,
            rgba(255, 153, 1, 1),
            rgba(255, 153, 1, 0) 70%
          );
        }

        .item-content:before {
          position: absolute;
          content: "";
          border-radius: 8px;
          z-index: -1;
          background: radial-gradient(
              144.25% 102.12% at 53.73% -2.06%,
              rgba(169, 181, 210, 0.2) 0%,
              rgba(0, 0, 0, 0) 100%
            ),
            #312c5a;
          top: 1px;
          left: 1px;
          width: calc(100% - 2px);
          height: calc(100% - 2px);
        }

        .blue:before {
          background: radial-gradient(
              144.25% 102.12% at 53.73% -2.06%,
              rgba(65, 118, 255, 0.2) 0%,
              rgba(0, 0, 0, 0) 100%
            ),
            #312c5a;
        }

        .blue-col:before {
          background: radial-gradient(
              144.25% 102.12% at 53.73% -2.06%,
              rgba(169, 200, 210, 0.2) 0%,
              rgba(0, 0, 0, 0) 100%
            ),
            #2c375a;
        }

        .pink:before {
          background: radial-gradient(
              144.25% 102.12% at 53.73% -2.06%,
              rgba(220, 95, 222, 0.2) 0%,
              rgba(0, 0, 0, 0) 100%
            ),
            #312c5a;
        }

        .red:before {
          background: radial-gradient(
              144.25% 102.12% at 53.73% -2.06%,
              rgba(255, 81, 65, 0.2) 0%,
              rgba(0, 0, 0, 0) 100%
            ),
            #493534;
        }

        .gold:before {
          background: radial-gradient(
              144.25% 102.12% at 53.73% -2.06%,
              rgba(252, 164, 33, 0.2) 0%,
              rgba(0, 0, 0, 0) 100%
            ),
            #312c5a;
        }

        .item-content {
          display: flex;
          align-items: center;
          justify-content: center;

          position: relative;
          z-index: 0;

          width: 100%;
          height: 80px;

          min-width: 200px;
          max-width: 200px;

          border-radius: 8px;
          padding: 12px;
        }

        .name {
          color: #fff;
          text-align: center;
          font-size: 12px;
          font-weight: 600;
        }

        .horz {
          display: flex;
          align-items: center;
          gap: 8px;

          color: #fff;
          font-size: 13px;
          font-weight: 700;
        }
      `}</style>
    </>
  );
}

export default LimitedItem;
