import { Routes, Route, useSearchParams, useLocation, useNavigate } from "@solidjs/router";
import {
  createEffect,
  createSignal,
  ErrorBoundary,
  lazy,
  Suspense,
} from "solid-js";
import { useUser } from "./contexts/usercontextprovider";
import Sidebar from "./components/SideBar/sidebar";
import { authedAPI, closeDropdowns, createNotification } from "./util/api";
import Navbar from "./components/NavBar/navbar";
import { Toaster } from "solid-toast";
import Loader from "./components/Loader/loader";
import LoadingScreen from "./components/Loader/loadingscreen";
import { Redirect } from "./util/redirect";
import { useWebsocket } from "./contexts/socketprovider";
import { ADMIN_ROLES } from "./resources/users";
import Freecoins from "./components/Freecoins/freecoins";
import PS99 from "./components/PS99/ps99";
import MM2 from "./components/MM2/mm2";
import DAHOOD from "./components/DAHOOD/dahood";
import Rakeback from "./components/Rakeback/rakeback";
import UserModal from "./components/UserPopup/userpopup";

const Admin = lazy(() => import("./pages/admin"));
const AdminDashboard = lazy(() => import("./components/Admin/dashboard"));
const AdminUsers = lazy(() => import("./components/Admin/users"));
const AdminStatistics = lazy(() => import("./components/Admin/statistics"));
const AdminFilter = lazy(() => import("./components/Admin/filter"));
const AdminCashier = lazy(() => import("./components/Admin/cashier"));
const AdminStatsbook = lazy(() => import("./components/Admin/statsbook"));
const AdminSettings = lazy(() => import("./components/Admin/settings"));

const Info = lazy(() => import("./pages/info"));
const TOS = lazy(() => import("./components/Documentation/tos"));
const FAQ = lazy(() => import("./components/Documentation/faq"));
const Privacy = lazy(() => import("./components/Documentation/privacy"));

const SignIn = lazy(() => import("./components/Signin/signin"));

const Profile = lazy(() => import("./pages/profile"));
const Transactions = lazy(() => import("./components/Profile/transactions"));
const History = lazy(() => import("./components/Profile/history"));
const Settings = lazy(() => import("./components/Profile/settings"));

const Deposit = lazy(() => import("./pages/deposits"));
const Withdraws = lazy(() => import("./pages/withdraws"));
const Marketplace = lazy(() => import("./pages/marketplace"));

const Leaderboard = lazy(() => import("./pages/leaderboard"));
const Affiliates = lazy(() => import("./pages/affiliates"));

const Coinflips = lazy(() => import("./pages/coinflips"));
const Jackpot = lazy(() => import("./pages/jackpot"));

function App() {
  let pageContent;

  const location = useLocation();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [user, { hasFetched, setBalance, setXP, getUser }] = useUser();
  const [ws] = useWebsocket();
  const [chat, setChat] = createSignal(false);
  const [isAuthenticated, setIsAuthenticated] = createSignal(false);

  createEffect(() => {
    if (location.pathname && pageContent) {
      pageContent.scrollTo({ top: 0 });
    }
  });

  createEffect(() => {
    if (ws() && ws().connected) {
      ws().on("balance", (type, amount, delay) => {
        if (type === "set") {
          setTimeout(() => setBalance(amount), +delay || 0);
        }

        if (type === "add") {
          setTimeout(() => setBalance(user()?.balance + amount), +delay || 0);
        }
      });

      ws().on("xp", (xp) => {
        setXP(xp);
      });

      ws().on("coinflip:own:started", (flip) => {
        if (!user()) return;
        let isCreator = flip[flip.ownerSide]?.id === user()?.id;
        let creatorWon = flip.winnerSide === flip.ownerSide;

        if ((isCreator && !creatorWon) || (!isCreator && creatorWon)) return;
      });
    }
  });

  createEffect(async () => {
    try {
      if (!hasFetched()) return;

      if (!user() && searchParams.a) {
        setSearchParams({ a: null, modal: "login" });
        localStorage.setItem("aff", searchParams.a);
        return;
      }

      if (user() && searchParams.a) {
        setSearchParams({ a: null });

        let res = await authedAPI(
          "/user/affiliate",
          "POST",
          JSON.stringify({
            code: searchParams.a,
          }),
          true
        );

        if (res.success) {
          createNotification(
            "success",
            `Successfully redeemed affiliate code ${searchParams.a}.`
          );
        }
      }
    } catch (e) {
      console.error(e);
      setSearchParams({ a: null });
    }
  });

  const ADMIN_PASSWORD = import.meta.env.VITE_ADMIN_PASSWORD;

  const handleAccessAdmin = () => {
    const enteredPassword = window.prompt("Enter Admin Password:");
    if (enteredPassword === ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      navigate("/admin");
    } else {
      alert("Incorrect password");
    }
  };

  createEffect(() => {
    if (location.pathname === "/admin" && !isAuthenticated()) {
      handleAccessAdmin();
    }
  });

  createEffect(() => {
    if (location.pathname === "/admin" && !isAuthenticated()) {
      handleAccessAdmin();
    }
  });

  return (
    <>
      {!hasFetched() ? (
        <LoadingScreen />
      ) : (
        <>
          <Toaster position="top-right" />

          {searchParams.modal === "login" && !user() && <SignIn ws={ws} />}

          {searchParams.modal === "redeemcode" && user() && (
            <Freecoins ws={ws} />
          )}

          {searchParams.modal === "ps99" && user() && <PS99 ws={ws} />}

          {searchParams.modal === "mm2" && user() && <MM2 ws={ws} />}

          {searchParams.modal === "dahood" && user() && <DAHOOD ws={ws} />}

          {searchParams?.modal === "rakeback" && user() && (
            <Rakeback ws={ws} user={user()} />
          )}

          {searchParams?.user && <UserModal user={user()} />}

          <ErrorBoundary
            fallback={(err) => {
              console.log(err.message);
              if (err.message.includes("dynamically imported module")) {
                return window.location.reload();
              }

              return (
                <>
                  <p clasname="error">Error!</p>
                  {console.log(err)}
                </>
              );
            }}
          >
            <div class="app" onClick={() => closeDropdowns()}>
              <Sidebar chat={chat()} setChat={setChat} />
              <div class="center" ref={pageContent}>
                <Navbar user={user()} chat={chat()} setChat={setChat} />
                <div class="content">
                  <Routes>
                    <Route
                      path="/"
                      element={
                        <Suspense fallback={<Loader />}>
                          <Coinflips user={user()} />
                        </Suspense>
                      }
                    />

                    <Route
                      path="/coinflip"
                      element={
                        <Suspense fallback={<Loader />}>
                          <Coinflips />
                        </Suspense>
                      }
                    />

                    
                  <Route
                      path="/jackpot"
                      element={
                        <Suspense fallback={<Loader />}>
                          <Jackpot />
                        </Suspense>
                      }
                    />


                    <Route
                      path="/leaderboard"
                      element={
                        <Suspense fallback={<Loader />}>
                          <Leaderboard />
                        </Suspense>
                      }
                    />

                    <Route
                      path="/info"
                      element={
                        <Suspense fallback={<Loader />}>
                          <Info />
                        </Suspense>
                      }
                    >
                      <Route
                        path="/tos"
                        element={
                          <Suspense fallback={<Loader />}>
                            <TOS />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/faq"
                        element={
                          <Suspense fallback={<Loader />}>
                            <FAQ />
                          </Suspense>
                        }
                      />
                      <Route
                        path="/privacy"
                        element={
                          <Suspense fallback={<Loader />}>
                            <Privacy />
                          </Suspense>
                        }
                      />
                    </Route>

                    <Route
                      path="/marketplace"
                      element={
                        <Suspense fallback={<Loader />}>
                          <Marketplace />
                        </Suspense>
                      }
                    />

                    {user() && (
                      <>
                        <Route
                          path="/affiliates"
                          element={
                            <Suspense fallback={<Loader />}>
                              <Affiliates user={user()} />
                            </Suspense>
                          }
                        />

                        <Route
                          path="/profile"
                          element={
                            <Suspense fallback={<Loader />}>
                              <Profile />
                            </Suspense>
                          }
                        >
                          <Route
                            path="/transactions"
                            element={<Transactions />}
                          />
                          <Route path="/history" element={<History />} />
                          <Route path="/settings" element={<Settings />} />
                        </Route>

                        <Route
                          path="/deposit"
                          element={
                            <Suspense fallback={<Loader />}>
                              <Deposit />
                            </Suspense>
                          }
                        />

                        <Route
                          path="/deposit"
                          element={
                            <Suspense fallback={<Loader />}>
                              <Deposit />
                            </Suspense>
                          }
                        />

                        <Route
                          path="/withdraw"
                          element={
                            <Suspense fallback={<Loader />}>
                              <Withdraws />
                            </Suspense>
                          }
                        />
                      </>
                    )}

                    {user() && ADMIN_ROLES.includes(user().role) && (
                      <>
                        <Route
                          path="/admin"
                          element={
                            <>
                              {isAuthenticated() ? (
                                <Suspense fallback={<Loader />}>
                                  <Admin />
                                </Suspense>
                              ) : (
                                handleAccessAdmin()
                              )}
                            </>
                          }
                        >
                          <Route
                            path="/"
                            element={
                              <Suspense fallback={<Loader />}>
                                <AdminDashboard />
                              </Suspense>
                            }
                          />

                          <Route
                            path="/users"
                            element={
                              <Suspense fallback={<Loader />}>
                                <AdminUsers />
                              </Suspense>
                            }
                          />

                          <Route
                            path="/statistics"
                            element={
                              <Suspense fallback={<Loader />}>
                                <AdminStatistics />
                              </Suspense>
                            }
                          />

                          <Route
                            path="/filter"
                            element={
                              <Suspense fallback={<Loader />}>
                                <AdminFilter />
                              </Suspense>
                            }
                          />

                          <Route
                            path="/cashier"
                            element={
                              <Suspense fallback={<Loader />}>
                                <AdminCashier />
                              </Suspense>
                            }
                          />

                          <Route
                            path="/statsbook"
                            element={
                              <Suspense fallback={<Loader />}>
                                <AdminStatsbook />
                              </Suspense>
                            }
                          />

                          <Route
                            path="/settings"
                            element={
                              <Suspense fallback={<Loader />}>
                                <AdminSettings />
                              </Suspense>
                            }
                          />
                        </Route>
                      </>
                    )}

                    {hasFetched() && <Route path="*" element={<Redirect />} />}
                  </Routes>

                  <div class="background" />
                </div>
              </div>
            </div>
          </ErrorBoundary>
        </>
      )}

      <style jsx>{`
        .app {
          width: 100vw;
          height: 100vh;

          display: flex;

          position: relative;
          overflow: hidden;
          scrollbar-color: transparent transparent;
        }

        .center {
          height: 100vh;
          width: 100%;
          position: relative;
          overflow: auto;
          scrollbar-color: transparent transparent;
        }

        .center::-webkit-scrollbar {
          display: none;
        }

        .content {
          width: 100%;
          min-height: calc(100% - 130px);

          position: relative;
          padding: 0 25px;
          scrollbar-color: transparent transparent;
        }

        .content::-webkit-scrollbar {
          display: none;
        }

        .background {
          position: absolute;
          max-width: 1500px;
          top: 0;
          left: 50%;
          transform: translateX(-50%);

          height: 100%;
          width: 100%;

          background-image: url("/assets/background.png");
          mix-blend-mode: luminosity;
          z-index: -1;

          background-repeat: no-repeat;
          background-position: center;
          background-size: contain;
        }

        .app::-webkit-scrollbar {
          display: none;
        }

        .error {
          color: #FFF;
        }

        @media only screen and (max-width: 1000px) {
          .center {
            padding-bottom: 50px;
          }
        }
      `}</style>
    </>
  );
}

export default App;
