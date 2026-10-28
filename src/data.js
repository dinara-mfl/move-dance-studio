export const styles = [
  {
    name: "Contemporary",
    tag: "FEEL EVERY MOVEMENT",
    description:
      "A little technique. A lot of feeling. Explore fluid movement and find a language that is entirely yours.",
    image: "contemporary.jpg",
    position: "50% 40%",
  },
  {
    name: "Hip-hop",
    tag: "MAKE THE FLOOR YOURS",
    description:
      "Find your groove with foundations, freestyle and choreography. Big energy, zero judgement.",
    image: "hiphop.jpg",
    position: "50% 40%",
  },
  {
    name: "Ballet",
    tag: "STRENGTH MEETS SOFTNESS",
    description:
      "From your first plié to a confident pirouette. Build poise, control and a deeper connection to your body.",
    image: "ballet.jpg",
    position: "50% 35%",
  },
  {
    name: "Heels",
    tag: "TAKE UP YOUR SPACE",
    description:
      "Walk taller. Move bolder. Musicality and expressive choreography in a supportive space.",
    image: "dancers.jpg",
    position: "75% 50%",
  },
  {
    name: "Jazz",
    tag: "A LITTLE EXTRA EXPRESSION",
    description:
      "Expressive lines, playful rhythm and feel-good combinations. Let your personality lead.",
    image: "contemporary.jpg",
    position: "50% 65%",
  },
  {
    name: "Stretch & mobility",
    tag: "MORE ROOM TO MOVE",
    description:
      "Slow down, lengthen and release. A thoughtful reset for dancers and everyday bodies alike.",
    image: "ballet.jpg",
    position: "50% 70%",
  },
];
export const plans = [
  {
    id: "single",
    name: "First steps",
    label: "ONE CLASS. ALL THE POSSIBILITY.",
    price: 18,
    credits: 1,
    days: 30,
    features: [
      "Any dance style",
      "Valid for 30 days",
      "A little taste of MOVE",
    ],
  },
  {
    id: "flow",
    name: "Find your flow",
    label: "YOUR NEW WEEKLY RITUAL.",
    price: 65,
    credits: 4,
    days: 30,
    features: [
      "4 classes, any style",
      "Valid for 30 days",
      "Make movement a habit",
    ],
    featured: true,
  },
  {
    id: "rhythm",
    name: "In your rhythm",
    label: "MORE MOVEMENT. MORE YOU.",
    price: 119,
    credits: 8,
    days: 60,
    features: [
      "8 classes, any style",
      "Valid for 60 days",
      "Room to explore something new",
    ],
  },
];
export const timezone = "Europe/Berlin";
export function schedule(now = new Date()) {
  const start = new Date(now.toISOString().slice(0, 10) + "T00:00:00Z");
  const teachers = ["Maya", "Jordan", "Elena", "Sasha", "Alex", "Noor"];
  return Array.from({ length: 42 }, (_, i) => {
    const day = Math.floor(i / 3);
    const style =
      (Math.floor(start.getTime() / 86400000) + day + (i % 3) * 2) % 6;
    const date = new Date(start);
    date.setUTCDate(date.getUTCDate() + day);
    date.setUTCHours([9, 15, 18][i % 3]);
    return {
      id: `${date.toISOString().slice(0, 10)}-${i % 3}`,
      style: styles[style].name,
      teacher: teachers[style],
      startsAt: date.toISOString(),
      duration: 60,
      level: i % 3 === 2 ? "Intermediate" : "All levels",
      capacity: 12,
      studio:
        (Math.floor(start.getTime() / 86400000) + day + (i % 3)) % 2
          ? "Studio 02"
          : "Studio 01",
    };
  });
}
export const dateLabel = (date, options = {}) =>
  new Intl.DateTimeFormat("en-GB", { timeZone: timezone, ...options }).format(
    new Date(date),
  );
