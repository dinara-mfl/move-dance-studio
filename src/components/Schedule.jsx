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
export default function Schedule({
  navigate,
  filter,
  setFilter,
  week,
  setWeek,
  day,
  setDay,
  selected,
  days,
  shown,
  account,
  reserve,
}) {
  return (
    <main className="schedule-page section">
      <div className="eyebrow">MAKE SOME SPACE IN YOUR WEEK</div>
      <div className="page-heading">
        <h1>
          Your next <span className="serif">move.</span>
        </h1>
        <p>
          Pick a class. Find your people.
          <br />
          All times shown in Berlin time.
        </p>
      </div>
      <div className="filter-row">
        {["All styles", ...styles.map((s) => s.name)].map((s) => (
          <button
            key={s}
            className={filter === s ? "selected" : ""}
            onClick={() => setFilter(s)}
          >
            {s}
          </button>
        ))}
      </div>
      <div className="week-heading">
        <h3>
          {selected
            ? dateLabel(selected, { month: "long", year: "numeric" })
            : "Loading schedule…"}
        </h3>
        <div>
          <button
            className="icon"
            disabled={week === 0}
            aria-label="Previous week"
            onClick={() => {
              setWeek(0);
              setDay(0);
            }}
          >
            <ArrowLeft size={20} />
          </button>
          <span>{week === 0 ? "This week" : "Next week"}</span>
          <button
            className="icon"
            disabled={week === 1}
            aria-label="Next week"
            onClick={() => {
              setWeek(1);
              setDay(0);
            }}
          >
            <ArrowRight size={20} />
          </button>
        </div>
      </div>
      <div className="day-tabs">
        {days.map((d, i) => (
          <button
            className={day === i ? "selected" : ""}
            key={d}
            onClick={() => setDay(i)}
          >
            <span>{dateLabel(d, { weekday: "short" })}</span>
            <strong>{dateLabel(d, { day: "2-digit" })}</strong>
          </button>
        ))}
      </div>
      <div className="class-table">
        <div className="table-header">
          <span>TIME</span>
          <span>CLASS / INSTRUCTOR</span>
          <span>LEVEL / STUDIO</span>
          <span>YOUR SPOT</span>
        </div>
        {shown.length ? (
          shown.map((c) => {
            const booked = account.bookings.some((b) => b.classId === c.id),
              past = new Date(c.startsAt) <= new Date();
            return (
              <article className="class-row" key={c.id}>
                <div className="class-time">
                  <strong>
                    {dateLabel(c.startsAt, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </strong>
                  <small>{c.duration} MIN</small>
                </div>
                <div>
                  <h3>{c.style}</h3>
                  <p>with {c.teacher}</p>
                </div>
                <div>
                  <span className="level">{c.level}</span>
                  <p>{c.studio}</p>
                </div>
                <div className="class-action">
                  <small>
                    {past
                      ? "Class has started"
                      : booked
                        ? "You’re on the list"
                        : `${c.remaining} spots available`}
                  </small>
                  <button
                    className="button dark"
                    disabled={past || booked || c.remaining === 0}
                    onClick={() => reserve(c)}
                  >
                    {past
                      ? "Closed"
                      : booked
                        ? "Reserved"
                        : c.remaining === 0
                          ? "Full"
                          : "Reserve"}
                    {!past && !booked && <Arrow />}
                  </button>
                </div>
              </article>
            );
          })
        ) : (
          <div className="empty">
            <CalendarDays size={32} />
            <h3>A little breathing room.</h3>
            <p>
              No {filter.toLowerCase()} classes on this day. Try another day or
              style.
            </p>
            <button
              className="text-link"
              onClick={() => setFilter("All styles")}
            >
              See all styles <Arrow />
            </button>
          </div>
        )}
      </div>
      <p className="schedule-foot">
        New here? All levels means you’re welcome. Reservations use one class
        credit.
      </p>
    </main>
  );
}
