import React, { useState, useEffect, useRef } from "react";
import {
  ArrowUpRight,
  ArrowRight,
  ArrowLeft,
  Plus,
  Minus,
  X,
  Check,
  Menu,
  CalendarDays,
  Clock,
  MapPin,
} from "lucide-react";
import { styles, plans, dateLabel } from "./data";
import { api, demo, supabase } from "./api";
import "./styles.css";
import Arrow from "./components/Arrow";
import Home from "./components/Home";
import Schedule from "./components/Schedule";
import Account from "./components/Account";
export default function App() {
  const [view, setView] = useState("home"),
    [modal, setModal] = useState(null),
    [user, setUser] = useState(null),
    [classes, setClasses] = useState([]),
    [account, setAccount] = useState({ bookings: [], purchases: [] }),
    [filter, setFilter] = useState("All styles"),
    [day, setDay] = useState(0),
    [week, setWeek] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [mobile, setMobile] = useState(false),
    [faq, setFaq] = useState(0),
    [payment, setPayment] = useState("card");
  const modalRef = useRef(null),
    previousFocus = useRef(null);
  const refresh = async () => {
    try {
      setClasses(await api("/classes"));
      if (user) setAccount(await api("/me"));
    } catch (e) {
      setNotice(e.message);
    }
  };
  useEffect(() => {
    refresh();
  }, [user]);
  useEffect(() => {
    if (demo) {
      if (sessionStorage.getItem("move-user"))
        setUser({ email: "dancer@example.com" });
      return;
    }
    if (!supabase) {
      setNotice(
        "Authentication is not configured. Check your environment settings.",
      );
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data }) => setUser(data.session?.user || null));
    const { data } = supabase.auth.onAuthStateChange((_, session) =>
      setUser(session?.user || null),
    );
    return () => data.subscription.unsubscribe();
  }, []);
  useEffect(() => {
    if (!user || demo) return;
    const params = new URLSearchParams(location.search);
    if (params.get("payment") === "paypal" && params.get("token")) {
      act(async () => {
        await api("/paypal/capture", {
          method: "POST",
          body: JSON.stringify({ orderId: params.get("token") }),
        });
        setNotice("Your PayPal payment is confirmed. Your pass is ready.");
        setView("account");
        await refresh();
        history.replaceState({}, "", location.pathname);
      });
    } else if (params.get("payment") === "success") {
      setNotice(
        "Checkout completed. Your pass appears after payment verification. Refresh your account in a moment.",
      );
      setView("account");
      history.replaceState({}, "", location.pathname);
    } else if (params.get("payment") === "cancel") {
      setNotice("Checkout cancelled. No pass has been added.");
      history.replaceState({}, "", location.pathname);
    }
  }, [user]);
  useEffect(() => {
    setError("");
    if (!modal) return;
    previousFocus.current = document.activeElement;
    document.body.style.overflow = "hidden";
    const background = [...document.getElementById("root").children].filter(
      (el) => !el.classList.contains("modal-overlay"),
    );
    background.forEach((el) => (el.inert = true));
    modalRef.current?.querySelector("button")?.focus();
    const listener = (e) => {
      if (e.key === "Escape") setModal(null);
      if (e.key === "Tab") {
        const nodes = modalRef.current?.querySelectorAll(
          "button:not([disabled]),input,a[href]",
        );
        if (!nodes?.length) return;
        const first = nodes[0],
          last = nodes[nodes.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", listener);
    return () => {
      document.body.style.overflow = "";
      background.forEach((el) => (el.inert = false));
      document.removeEventListener("keydown", listener);
      previousFocus.current?.focus();
    };
  }, [modal]);
  async function act(fn) {
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(e.message);
      if (!modal) setNotice(e.message);
    } finally {
      setBusy(false);
    }
  }
  function navigate(to) {
    setView(to);
    setMobile(false);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
  function section(id) {
    setView("home");
    setMobile(false);
    setTimeout(
      () => document.getElementById(id)?.scrollIntoView({ behavior: "smooth" }),
      40,
    );
  }
  function reserve(c) {
    setError("");
    setModal(user ? { type: "booking", class: c } : { type: "login" });
  }
  async function login(provider) {
    if (demo) return;
    await act(async () => {
      if (!supabase) throw Error("Sign-in is not configured yet.");
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: location.origin,
          scopes: provider === "azure" ? "email" : undefined,
        },
      });
      if (error) throw error;
    });
  }
  const days = [...new Set(classes.map((c) => c.startsAt.slice(0, 10)))].slice(
    week * 7,
    week * 7 + 7,
  );
  const selected = days[day];
  const shown = classes.filter(
    (c) =>
      c.startsAt.startsWith(selected || "none") &&
      (filter === "All styles" || c.style === filter),
  );
  const credits = account.purchases
    .filter((p) => new Date(p.expiresAt) > new Date())
    .reduce((n, p) => n + p.remaining, 0);
  const choosePlan = (p) => {
    setPayment("card");
    setModal(user ? { type: "checkout", plan: p } : { type: "login" });
  };
  return (
    <>
      <div className="topline">
        <span>A little courage. A little music. A whole new you.</span>
        <span>
          YOUR NEXT CHAPTER STARTS ON THE DANCE FLOOR <ArrowUpRight size={12} />
        </span>
      </div>
      <header>
        <a
          className="logo"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
          aria-label="MOVE home"
        >
          MOVE<span>®</span>
        </a>
        <nav className={mobile ? "open" : ""}>
          <button onClick={() => section("styles")}>Our classes</button>
          <button
            className={view === "schedule" ? "active" : ""}
            onClick={() => navigate("schedule")}
          >
            Schedule
          </button>
          <button onClick={() => section("memberships")}>Memberships</button>
          <button onClick={() => section("studio")}>The studio</button>
        </nav>
        <div className="nav-actions">
          <button
            className="signin"
            onClick={() =>
              user ? navigate("account") : setModal({ type: "login" })
            }
          >
            {user ? "My MOVE" : "Log in"} <Arrow />
          </button>
          <button
            className="button dark nav-book"
            onClick={() => navigate("schedule")}
          >
            Find your class <Arrow />
          </button>
          <button
            className="mobile-toggle icon"
            aria-label="Toggle navigation"
            aria-expanded={mobile}
            onClick={() => setMobile(!mobile)}
          >
            <Menu />
          </button>
        </div>
      </header>
      {notice && (
        <div className="notice" role="status">
          {notice}
          <button
            className="icon"
            aria-label="Dismiss notification"
            onClick={() => setNotice("")}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {view === "home" && (
        <Home
          classes={classes}
          navigate={navigate}
          reserve={reserve}
          setModal={setModal}
          choosePlan={choosePlan}
          faq={faq}
          setFaq={setFaq}
        />
      )}
      {view === "schedule" && (
        <Schedule
          navigate={navigate}
          filter={filter}
          setFilter={setFilter}
          week={week}
          setWeek={setWeek}
          day={day}
          setDay={setDay}
          selected={selected}
          days={days}
          shown={shown}
          account={account}
          reserve={reserve}
        />
      )}
      {view === "account" && (
        <Account
          credits={credits}
          account={account}
          refresh={refresh}
          section={section}
          navigate={navigate}
          setModal={setModal}
          setUser={setUser}
          setAccount={setAccount}
        />
      )}
      <footer>
        <div className="footer-top">
          <a
            href="#"
            className="logo"
            onClick={(e) => {
              e.preventDefault();
              navigate("home");
            }}
          >
            MOVE<span>®</span>
          </a>
          <p>
            Find your rhythm.
            <br />
            Feel like yourself.
          </p>
          <div>
            <button onClick={() => navigate("schedule")}>Schedule ↗</button>
            <button onClick={() => section("memberships")}>
              Memberships ↗
            </button>
          </div>
          <div>
            <button
              onClick={() =>
                setModal({
                  type: "info",
                  title: "Say hello",
                  text: "MOVE is a fictional dance studio built as a portfolio project. Explore the demo to try booking and membership flows. No real classes or payments are offered in demo mode.",
                })
              }
            >
              Say hello ↗
            </button>
            <button onClick={() => section("studio")}>Our studio ↗</button>
          </div>
        </div>
        <div className="footer-bottom">
          <span>
            © {new Date().getFullYear()} MOVE STUDIO · A PORTFOLIO CONCEPT
          </span>
          <div>
            <button
              onClick={() =>
                setModal({
                  type: "info",
                  title: "Privacy & demo data",
                  text: "Demo mode stores reservations and passes in this browser only. No payment details are collected and no emails are sent. Use “Reset demo” to erase this data. Connected mode uses Supabase for identity, the app database for bookings, Stripe or PayPal for payments and Resend for transactional email. A real operator must publish its own privacy notice before launch.",
                })
              }
            >
              Privacy
            </button>
            <button
              onClick={() =>
                setModal({
                  type: "info",
                  title: "Studio policy",
                  text: "One credit reserves one class. Cancel at least 12 hours before the start to return your credit. Passes are one-time purchases, expire after the stated number of days and must be valid on the class date. MOVE is a fictional portfolio project; these are demonstration policies.",
                })
              }
            >
              Studio policy
            </button>
            {demo && (
              <button onClick={() => setModal({ type: "reset" })}>
                Reset demo
              </button>
            )}
          </div>
        </div>
      </footer>
      {demo && (
        <div className="demo-indicator">
          <span className="dot" /> PORTFOLIO DEMO{" "}
          <span>· No real payments or emails</span>
        </div>
      )}
      {modal && (
        <div
          className="modal-overlay"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className="modal"
            ref={modalRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="close icon"
              aria-label="Close dialog"
              onClick={() => setModal(null)}
            >
              <X />
            </button>
            {modal.type === "login" && (
              <>
                <div className="eyebrow">
                  A LITTLE CLOSER TO THE DANCE FLOOR
                </div>
                <h2 id="modal-title">
                  Your MOVE
                  <br />
                  starts <span className="serif">here.</span>
                </h2>
                <p>Sign in to save your spot and find your rhythm.</p>
                <div className="providers">
                  {[
                    ["google", "G", "Google"],
                    ["apple", "●", "Apple"],
                    ["azure", "⊞", "Microsoft"],
                  ].map(([provider, icon, label]) => (
                    <button
                      key={provider}
                      disabled={demo || busy || !supabase}
                      onClick={() => login(provider)}
                    >
                      <b>{icon}</b>Continue with {label}
                      <Arrow />
                    </button>
                  ))}
                </div>
                {demo && (
                  <>
                    <p className="demo-explanation">
                      Social sign-in is available when provider keys are
                      configured. Explore everything with a demo account.
                    </p>
                    <button
                      className="button dark full"
                      onClick={() => {
                        sessionStorage.setItem("move-user", "true");
                        setUser({ email: "dancer@example.com" });
                        setModal(null);
                        setNotice(
                          "Welcome to the demo. Choose a pass, then reserve your first class.",
                        );
                      }}
                    >
                      Enter demo account <Arrow />
                    </button>
                  </>
                )}
                <small className="muted">
                  By continuing, you agree to our studio policy.
                </small>
              </>
            )}
            {modal.type === "style" && (
              <>
                <img
                  className="modal-photo"
                  src={"/images/" + modal.style.image}
                  alt={modal.style.name}
                />
                <div className="eyebrow">{modal.style.tag}</div>
                <h2 id="modal-title">{modal.style.name}</h2>
                <p>{modal.style.description}</p>
                <button
                  className="button dark full"
                  onClick={() => {
                    setFilter(modal.style.name);
                    setModal(null);
                    navigate("schedule");
                  }}
                >
                  Find a class <Arrow />
                </button>
              </>
            )}
            {modal.type === "booking" && (
              <>
                <div className="eyebrow">SAVE A LITTLE SPACE FOR YOU</div>
                <h2 id="modal-title">
                  You. The music.
                  <br />
                  <span className="serif">This class.</span>
                </h2>
                <div className="booking-details">
                  <h3>{modal.class.style}</h3>
                  <p>
                    <CalendarDays size={17} />
                    {dateLabel(modal.class.startsAt, {
                      weekday: "long",
                      day: "numeric",
                      month: "long",
                    })}
                  </p>
                  <p>
                    <Clock size={17} />
                    {dateLabel(modal.class.startsAt, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · 60 minutes · Berlin time
                  </p>
                  <p>
                    <MapPin size={17} />
                    {modal.class.studio} · with {modal.class.teacher}
                  </p>
                </div>
                <div className="checkout-total">
                  <span>Class credit</span>
                  <strong>1 credit</strong>
                </div>
                <p className="muted">
                  Cancel up to 12 hours before class to get your credit back.
                </p>
                {credits > 0 ? (
                  <button
                    className="button dark full"
                    disabled={busy}
                    onClick={() =>
                      act(async () => {
                        const booking = await api("/bookings", {
                          method: "POST",
                          body: JSON.stringify({ classId: modal.class.id }),
                        });
                        await refresh();
                        setModal({ type: "confirmed", booking });
                      })
                    }
                  >
                    {busy ? "Reserving…" : "Confirm reservation"}
                    <Arrow />
                  </button>
                ) : (
                  <button
                    className="button dark full"
                    onClick={() => {
                      setModal(null);
                      section("memberships");
                    }}
                  >
                    Get a class pass first <Arrow />
                  </button>
                )}
              </>
            )}
            {modal.type === "checkout" && (
              <>
                <div className="eyebrow">A GOOD INVESTMENT IN YOURSELF</div>
                <h2 id="modal-title">
                  {modal.plan.name}
                  <span className="serif">.</span>
                </h2>
                <p>
                  {modal.plan.credits}{" "}
                  {modal.plan.credits === 1 ? "class" : "classes"} · Valid for{" "}
                  {modal.plan.days} days · No auto-renewal
                </p>
                <div className="payment-options">
                  {[
                    [
                      "card",
                      "Card & wallets",
                      "Visa, Mastercard, Apple Pay, Google Pay",
                    ],
                    ["paypal", "PayPal", "Continue securely with PayPal"],
                  ].map(([id, title, desc]) => (
                    <button
                      className={payment === id ? "selected" : ""}
                      key={id}
                      onClick={() => setPayment(id)}
                    >
                      <span className="radio" />
                      <span>
                        <strong>{title}</strong>
                        <small>{desc}</small>
                      </span>
                    </button>
                  ))}
                </div>
                <div className="checkout-total">
                  <span>Total · EUR</span>
                  <strong>€{modal.plan.price}.00</strong>
                </div>
                <p className="muted">
                  {demo
                    ? "Demo checkout. No card details, charge or email."
                    : "Payment details are entered securely on the payment provider’s website. Wallet availability depends on device and region."}
                </p>
                <button
                  className="button dark full"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      if (demo) {
                        await api("/demo/purchase", {
                          method: "POST",
                          body: JSON.stringify({ planId: modal.plan.id }),
                        });
                        await refresh();
                        setModal({ type: "purchased", plan: modal.plan });
                      } else {
                        const r = await api(
                          payment === "paypal" ? "/paypal/orders" : "/checkout",
                          {
                            method: "POST",
                            body: JSON.stringify({ planId: modal.plan.id }),
                          },
                        );
                        location.assign(r.url);
                      }
                    })
                  }
                >
                  {busy
                    ? "Just a moment…"
                    : demo
                      ? "Simulate purchase"
                      : `Continue to ${payment === "paypal" ? "PayPal" : "secure checkout"}`}
                  <Arrow />
                </button>
              </>
            )}
            {["confirmed", "purchased"].includes(modal.type) && (
              <>
                <div className="success-icon">
                  <Check size={30} />
                </div>
                <div className="eyebrow">THAT’S A GOOD MOVE</div>
                <h2 id="modal-title">
                  {modal.type === "confirmed" ? "You’re on" : "Let’s find"}
                  <br />
                  <span className="serif">
                    {modal.type === "confirmed" ? "the list." : "your rhythm."}
                  </span>
                </h2>
                <p>
                  {modal.type === "confirmed"
                    ? `${modal.booking.style} is reserved. ${demo ? "This is a demo reservation; no email was sent." : "Your confirmation email is queued for delivery."}`
                    : `Your ${modal.plan.credits}-class demo pass is ready. No payment was made.`}
                </p>
                <button
                  className="button dark full"
                  onClick={() => {
                    navigate(
                      modal.type === "confirmed" ? "account" : "schedule",
                    );
                    setModal(null);
                  }}
                >
                  {modal.type === "confirmed"
                    ? "View my reservations"
                    : "Find a class"}
                  <Arrow />
                </button>
              </>
            )}
            {modal.type === "cancel" && (
              <>
                <h2 id="modal-title">
                  Another <span className="serif">time?</span>
                </h2>
                <p>
                  Cancel your {modal.booking.style} reservation? One credit will
                  be returned to the original pass.
                </p>
                <button
                  className="button dark full"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await api("/bookings/" + modal.booking.id, {
                        method: "DELETE",
                      });
                      await refresh();
                      setModal(null);
                      setNotice(
                        "Reservation cancelled. Your credit has been returned.",
                      );
                    })
                  }
                >
                  {busy ? "Cancelling…" : "Cancel reservation"}
                  <Arrow />
                </button>
              </>
            )}
            {modal.type === "info" && (
              <>
                <h2 id="modal-title">{modal.title}</h2>
                <p>{modal.text}</p>
              </>
            )}
            {modal.type === "reset" && (
              <>
                <h2 id="modal-title">
                  A fresh <span className="serif">start.</span>
                </h2>
                <p>
                  This removes all demo passes and reservations from this
                  browser.
                </p>
                <button
                  className="button dark full"
                  onClick={() => {
                    localStorage.removeItem("move-demo-v1");
                    refresh();
                    setModal(null);
                    setNotice("Demo data cleared.");
                  }}
                >
                  Reset demo <Arrow />
                </button>
              </>
            )}
            {error && (
              <p className="error" role="alert">
                {error}
              </p>
            )}
          </section>
        </div>
      )}
    </>
  );
}
