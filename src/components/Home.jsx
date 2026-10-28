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
export default function Home({
  classes,
  navigate,
  reserve,
  setModal,
  choosePlan,
  faq,
  setFaq,
}) {
  return (
    <main>
      <section className="hero">
        <div className="hero-copy">
          <div className="eyebrow">
            <span className="dot" /> A SPACE TO MOVE. A PLACE TO BELONG.
          </div>
          <h1>
            Less thinking.
            <br />
            More <span className="serif">feeling.</span>
          </h1>
          <p>
            Get out of your head and into your body.
            <br />
            Dance classes for every mood, every level,
            <br className="desktop" /> and every version of you.
          </p>
          <button className="button dark" onClick={() => navigate("schedule")}>
            Find your first class <Arrow />
          </button>
          <div className="hero-bottom">
            <span className="hand-star">✳</span>
            <span>
              No perfect moves.
              <br />
              Just a place to start.
            </span>
            <span className="small-index">
              BERLIN, DE
              <br />
              52.52° N / 13.40° E
            </span>
          </div>
        </div>
        <div className="hero-photo">
          <img
            src="/images/dancers.jpg"
            alt="Dancer reaching into an expressive movement"
            fetchPriority="high"
          />
          <span className="photo-caption">MAKE ROOM FOR MOVEMENT.</span>
          <div className="photo-sticker">
            Come as
            <br />
            you <i>are.</i>
            <ArrowUpRight size={30} />
          </div>
          <div className="photo-label">
            <span>
              YOUR BODY.
              <br />
              YOUR RHYTHM.
            </span>
            <span>01 — MOVE STUDIO</span>
          </div>
        </div>
      </section>
      <div
        className="ticker"
        aria-label="Contemporary, hip-hop, ballet, heels, jazz, stretch"
      >
        <span>CONTEMPORARY</span>
        <b>✳</b>
        <span>HIP-HOP</span>
        <b>✳</b>
        <span>BALLET</span>
        <b>✳</b>
        <span>HEELS</span>
        <b>✳</b>
        <span>JAZZ</span>
        <b>✳</b>
        <span>STRETCH</span>
        <b>✳</b>
      </div>
      <section className="section styles" id="styles">
        <div className="section-heading">
          <div>
            <div className="eyebrow">01 / FIND YOUR THING</div>
            <h2>
              So many ways
              <br />
              to <span className="serif">move.</span>
            </h2>
          </div>
          <p>
            Go with what you love.
            <br />
            Or fall for something completely new.
          </p>
          <button className="text-link" onClick={() => navigate("schedule")}>
            Explore the schedule <Arrow />
          </button>
        </div>
        <div className="style-grid">
          {styles.slice(0, 3).map((s, i) => (
            <button
              className="style-card"
              key={s.name}
              onClick={() => setModal({ type: "style", style: s })}
            >
              <div className="style-image">
                <img
                  src={"/images/" + s.image}
                  alt={`${s.name} dance in motion`}
                  loading="lazy"
                  style={{ objectPosition: s.position }}
                />
                <span className="style-num">0{i + 1}</span>
                <span className="round-arrow">
                  <Arrow />
                </span>
              </div>
              <div className="style-title">
                <h3>{s.name}</h3>
                <span>
                  {i === 1
                    ? "GROOVE & ENERGY"
                    : i === 2
                      ? "GRACE & STRENGTH"
                      : "FLOW & EXPRESSION"}
                </span>
              </div>
            </button>
          ))}
        </div>
        <div className="other-styles">
          <span>AND THERE’S MORE TO EXPLORE</span>
          {styles.slice(3).map((s) => (
            <button
              key={s.name}
              onClick={() => setModal({ type: "style", style: s })}
            >
              {s.name}
              <Plus size={17} />
            </button>
          ))}
        </div>
      </section>
      <section className="schedule-teaser">
        <div>
          <div className="eyebrow">02 / YOUR NEXT GOOD HOUR</div>
          <h2>
            Make time
            <br />
            for <span className="serif">yourself.</span>
          </h2>
          <p>
            One hour. Your favourite track.
            <br />
            Nowhere else you need to be.
          </p>
          <button className="button pink" onClick={() => navigate("schedule")}>
            View full schedule <Arrow />
          </button>
        </div>
        <div className="teaser-list">
          <div className="teaser-top">
            <span>COMING UP AT MOVE</span>
            <span>ALL TIMES · BERLIN</span>
          </div>
          {classes
            .filter((c) => new Date(c.startsAt) > new Date())
            .slice(0, 3)
            .map((c) => (
              <div className="teaser-row" key={c.id}>
                <div className="teaser-date">
                  <strong>{dateLabel(c.startsAt, { day: "2-digit" })}</strong>
                  <span>{dateLabel(c.startsAt, { month: "short" })}</span>
                </div>
                <div>
                  <h3>{c.style}</h3>
                  <p>
                    {dateLabel(c.startsAt, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    · {c.duration} min · {c.level}
                  </p>
                </div>
                <button
                  className="round-arrow"
                  aria-label={`Book ${c.style}`}
                  onClick={() => reserve(c)}
                >
                  <Arrow />
                </button>
              </div>
            ))}
        </div>
      </section>
      <section className="section memberships" id="memberships">
        <div className="section-heading">
          <div>
            <div className="eyebrow">03 / A LITTLE COMMITMENT TO YOU</div>
            <h2>
              Your pace.
              <br />
              Your <span className="serif">pass.</span>
            </h2>
          </div>
          <p>
            No joining fees. No auto-renewal.
            <br />
            Just more of what makes you feel good.
          </p>
        </div>
        <div className="plans">
          {plans.map((p) => (
            <article
              key={p.id}
              className={"plan " + (p.featured ? "featured" : "")}
            >
              <div className="plan-top">
                <span>
                  {p.credits === 1
                    ? "THE INTRO"
                    : "THE " + p.credits + "-CLASS PASS"}
                </span>
                {p.featured && (
                  <span className="recommended">A GOOD PLACE TO START ↗</span>
                )}
              </div>
              <h3>{p.name}</h3>
              <div className="price">
                €{p.price}
                <span>
                  / {p.credits === 1 ? "class" : p.credits + " classes"}
                </span>
              </div>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <Check size={15} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={"button " + (p.featured ? "dark" : "outline")}
                onClick={() => choosePlan(p)}
              >
                Choose your pass <Arrow />
              </button>
            </article>
          ))}
        </div>
        <div className="payment-note">
          <span>MOVE YOUR WAY. PAY YOUR WAY.</span>
          <b>VISA</b>
          <b>Mastercard</b>
          <b>PayPal</b>
          <span>Apple Pay</span>
          <span>Google Pay</span>
        </div>
      </section>
      <section className="studio" id="studio">
        <div className="studio-photo">
          <img
            src="/images/studio.jpg"
            loading="lazy"
            alt="People coming together on an open-air dance floor"
          />
          <span>LEAVE THE OUTSIDE WORLD AT THE DOOR.</span>
        </div>
        <div className="studio-copy">
          <div className="eyebrow">04 / MORE THAN FOUR WALLS</div>
          <h2>
            A dance studio.
            <br />A softer <span className="serif">landing.</span>
          </h2>
          <p>
            Some days, you come to learn a new step. Others, you just need to
            shake the day off. There’s room for both here.
          </p>
          <p>
            We’re building a space for curious people, first-timers and lifelong
            dancers. Good music. Supportive teachers. And absolutely no pressure
            to be anyone but yourself.
          </p>
          <div className="studio-detail">
            <MapPin size={18} />
            <span>
              Berlin, Germany
              <br />
              <small>Concept studio · portfolio project</small>
            </span>
          </div>
          <button className="text-link" onClick={() => navigate("schedule")}>
            We'll meet you on the floor <Arrow />
          </button>
        </div>
      </section>
      <section className="section faq">
        <div>
          <div className="eyebrow">05 / BEFORE YOUR FIRST MOVE</div>
          <h2>
            A few things
            <br />
            to <span className="serif">know.</span>
          </h2>
        </div>
        <div>
          {[
            [
              "I’ve never danced before. Can I join?",
              "Absolutely. Choose an “All levels” class. We start with the foundations, give you options and leave plenty of space to find your feet.",
            ],
            [
              "What should I bring?",
              "Wear something you can move in, bring water and clean indoor trainers. For ballet, socks or ballet shoes work. For heels, choose a secure pair you feel comfortable in.",
            ],
            [
              "Can I cancel my reservation?",
              "You can cancel from My MOVE up to 12 hours before class. Your class credit is returned to your original pass, with its original expiry date.",
            ],
            [
              "How do class passes work?",
              "Buy a one-time pass, then use one credit to reserve a class. Your pass must be valid on the class date. Passes do not renew automatically.",
            ],
          ].map(([q, a], i) => (
            <div className="faq-item" key={q}>
              <button
                aria-expanded={faq === i}
                onClick={() => setFaq(faq === i ? -1 : i)}
              >
                {q}
                {faq === i ? <Minus size={19} /> : <Plus size={19} />}
              </button>
              {faq === i && <p>{a}</p>}
            </div>
          ))}
        </div>
      </section>
      <section className="last-call">
        <div className="eyebrow">THAT THING YOU'VE BEEN MEANING TO TRY?</div>
        <h2>
          This is your <span className="serif">sign.</span>
        </h2>
        <button className="button dark" onClick={() => navigate("schedule")}>
          Make your first move <Arrow />
        </button>
        <span className="big-star">✳</span>
      </section>
    </main>
  );
}
