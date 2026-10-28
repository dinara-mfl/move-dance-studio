import React from "react";
import {
  ArrowUpRight,
  ArrowLeft,
  ArrowRight,
  Plus,
  Minus,
  Check,
  CalendarDays,
  MapPin,
  X,
} from "lucide-react";
import { styles, plans, dateLabel } from "../data";
import { demo, supabase } from "../api";
import Arrow from "./Arrow";
export default function Account({
  credits,
  account,
  refresh,
  section,
  navigate,
  setModal,
  setUser,
  setAccount,
}) {
  return (
    <main className="section account">
      <div className="eyebrow">YOUR SPACE AT MOVE</div>
      <div className="page-heading">
        <h1>
          Hello, <span className="serif">dancer.</span>
        </h1>
        <button
          className="text-link"
          onClick={async () => {
            if (demo) sessionStorage.removeItem("move-user");
            else await supabase.auth.signOut();
            setUser(null);
            setAccount({ bookings: [], purchases: [] });
            navigate("home");
          }}
        >
          Log out <Arrow />
        </button>
      </div>
      <div className="account-summary">
        <div>
          <span>YOUR CLASS CREDITS</span>
          <strong>{credits}</strong>
        </div>
        <div>
          <p>A little time, just for you.</p>
          <button
            className="button dark"
            onClick={() => section("memberships")}
          >
            Get a pass <Arrow />
          </button>
        </div>
      </div>
      <div className="account-title">
        <h2>Your reservations</h2>
        <button className="text-link" onClick={refresh}>
          Refresh <Arrow />
        </button>
      </div>
      {account.bookings.length ? (
        account.bookings.map((b) => (
          <div className="booking-row" key={b.id}>
            <CalendarDays />
            <div>
              <h3>{b.style}</h3>
              <p>
                {dateLabel(b.startsAt, {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}{" "}
                · {b.studio}
              </p>
              <small>
                {demo
                  ? "Demo booking · no email sent"
                  : b.emailStatus === "sent"
                    ? "Confirmation email sent"
                    : "Confirmation email queued"}
              </small>
            </div>
            <button
              className="text-link"
              disabled={new Date(b.startsAt) - Date.now() < 43200000}
              onClick={() => setModal({ type: "cancel", booking: b })}
            >
              Cancel <X size={15} />
            </button>
          </div>
        ))
      ) : (
        <div className="empty">
          <CalendarDays />
          <h3>Your dance floor is waiting.</h3>
          <p>Find a class that feels like you.</p>
          <button className="button dark" onClick={() => navigate("schedule")}>
            Explore classes <Arrow />
          </button>
        </div>
      )}
      <h2 className="pass-heading">Your passes</h2>
      {account.purchases.length ? (
        account.purchases.map((p) => (
          <div className="pass-row" key={p.id}>
            <h3>{p.name}</h3>
            <span>{p.remaining} credits remaining</span>
            <span>
              Expires{" "}
              {dateLabel(p.expiresAt, {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        ))
      ) : (
        <p className="muted">
          No passes yet. Your first move starts with one class.
        </p>
      )}
    </main>
  );
}
