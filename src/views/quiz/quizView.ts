import L from "leaflet";
import { getJson } from "../../api/http";
import { fetchSpeciesIndex } from "../../api/speciesIndex";
import { nextQuizAt, quizDateAt, todaysQuiz } from "../../data/dailyQuiz";
import { unsealQuiz } from "../../data/publishedQuiz";
import type { DailyQuestion, DailyQuiz, QuizSchedule } from "../../models/dailyQuiz";
import type { SpeciesSummary } from "../../models/species";
import { routes } from "../../router";
import { el } from "../../ui/dom";
import { loadAnswers, saveAnswers } from "./progress";
import { pointsBreakdown, POINTS_PER_QUESTION, score, timeUntil, type Answer } from "./scoring";

const COUNTDOWN_TICK_MS = 1000;

export function mountQuizView(outlet: HTMLElement): () => void {
  let disposed = false;
  let cleanup = () => {};
  const heading = el("h2", {}, "Who's that mammal?");
  const stage = el("div", { className: "quiz__stage" }, el("p", { className: "book-status", role: "status" }, "Fetching today's photos…"));
  outlet.append(
    el(
      "section",
      { className: "book" },
      el(
        "div",
        { className: "page page--single quiz" },
        heading,
        el(
          "p",
          { className: "lede" },
          "Five real photos of threatened mammals in the wild. Name each one, then pin where it was photographed. Everyone gets the same five each day.",
        ),
        stage,
      ),
    ),
  );

  Promise.all([getJson<QuizSchedule>(`${import.meta.env.BASE_URL}daily-quiz.json`), fetchSpeciesIndex()])
    .then(async ([schedule, index]) => {
      const published = todaysQuiz(schedule.quizzes, quizDateAt(new Date()));
      const quiz = published && (await unsealQuiz(published));
      if (disposed) return;
      if (!quiz) {
        stage.replaceChildren(el("p", { className: "book-status" }, "The first quiz isn't out yet. Check back tomorrow."));
        return;
      }
      heading.textContent = `Who's that mammal? #${quiz.number}`;
      const speciesByKey = new Map(index.map((species) => [species.gbifKey, species]));
      const answers = loadAnswers(quiz.date);

      const show = () => {
        cleanup();
        const question = quiz.questions[answers.length];
        if (!question) {
          cleanup = results(stage, quiz, answers, speciesByKey);
          return;
        }
        cleanup = ask(stage, quiz, answers, question, speciesByKey, (answer) => {
          answers.push(answer);
          saveAnswers(quiz.date, answers);
        }, show);
      };
      show();
    })
    .catch((error: unknown) => {
      if (disposed) return;
      console.error(error);
      stage.replaceChildren(el("p", { className: "book-status" }, "Couldn't fetch today's quiz just now. Please refresh to try again."));
    });

  return () => {
    disposed = true;
    cleanup();
  };
}

function ask(
  stage: HTMLElement,
  quiz: DailyQuiz,
  answers: Answer[],
  question: DailyQuestion,
  speciesByKey: Map<number, SpeciesSummary>,
  onAnswer: (answer: Answer) => void,
  onNext: () => void,
): () => void {
  const answer = speciesByKey.get(question.speciesKey);
  const choices = question.choices.flatMap((key) => speciesByKey.get(key) ?? []);
  const reveal = el("div", { className: "quiz__reveal", role: "status" });
  const where = el("div", { className: "quiz__where", hidden: true });
  let map: L.Map | undefined;

  const buttons = choices.map((choice) => el("button", { type: "button", className: "quiz__choice" }, choice.commonName));
  buttons.forEach((button, i) =>
    button.addEventListener("click", () => {
      const nameCorrect = choices[i] === answer;
      buttons.forEach((other, j) => {
        other.disabled = true;
        other.classList.toggle("quiz__choice--answer", choices[j] === answer);
      });
      if (!nameCorrect) button.classList.add("quiz__choice--wrong");
      reveal.replaceChildren(
        el(
          "p",
          { className: "quiz__verdict" },
          nameCorrect ? "Correct! " : "Not quite. ",
          "It's a ",
          answer ? el("a", { href: routes.species(answer.gbifKey), target: "_blank", rel: "noopener" }, answer.commonName) : "mystery mammal",
          ".",
        ),
      );
      map = pinTheSighting(where, question, nameCorrect, answers.length === quiz.questions.length - 1, onAnswer, onNext);
    }),
  );

  stage.replaceChildren(
    el(
      "article",
      { className: "quiz__question" },
      el("p", { className: "quiz__progress" }, `Photo ${answers.length + 1} of ${quiz.questions.length} · ${totalPoints(answers).toLocaleString()} points so far`),
      el(
        "figure",
        { className: "quiz__photo" },
        el("img", { src: question.photo.url, alt: "A threatened mammal photographed in the wild" }),
        el("figcaption", {}, `© ${question.photo.credit ?? "Unknown"}`),
      ),
      el("div", { className: "quiz__choices" }, ...buttons),
      reveal,
      where,
    ),
  );

  return () => map?.remove();
}

function pinTheSighting(
  container: HTMLElement,
  question: DailyQuestion,
  nameCorrect: boolean,
  isLast: boolean,
  onAnswer: (answer: Answer) => void,
  onNext: () => void,
): L.Map {
  const prompt = el("p", { className: "quiz__where-prompt" }, "Where was it photographed? Click the map to drop a pin.");
  const mapElement = el("div", { className: "quiz__map" });
  const lockIn = el("button", { type: "button", className: "button", disabled: true }, "Lock in guess");
  const outcome = el("div", { className: "quiz__outcome", role: "status" });
  container.replaceChildren(prompt, mapElement, lockIn, outcome);
  container.hidden = false;

  const map = L.map(mapElement, { worldCopyJump: true, minZoom: 1 }).setView([15, 20], 1);
  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 18,
    className: "base-tiles",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  }).addTo(map);
  let pin: L.CircleMarker | undefined;

  function placePin(event: L.LeafletMouseEvent) {
    pin ??= L.circleMarker(event.latlng, { radius: 8, className: "quiz__pin" }).addTo(map);
    pin.setLatLng(event.latlng);
    lockIn.disabled = false;
  }
  map.on("click", placePin);

  lockIn.addEventListener("click", () => {
    if (!pin) return;
    const guessed = pin.getLatLng().wrap();
    const actual = L.latLng(question.lat, question.lng);
    const answer = score(nameCorrect, { lat: guessed.lat, lng: guessed.lng }, { lat: actual.lat, lng: actual.lng });
    onAnswer(answer);

    map.off("click", placePin);
    lockIn.remove();
    L.circleMarker(actual, { radius: 8, className: "quiz__actual" }).addTo(map);
    L.polyline([guessed, actual], { className: "quiz__line" }).addTo(map);
    map.fitBounds(L.latLngBounds([guessed, actual]), { padding: [40, 40], maxZoom: 6 });

    const points = pointsBreakdown(answer);
    outcome.replaceChildren(
      el("p", { className: "quiz__distance" }, `${Math.round(answer.km).toLocaleString()} km away`),
      el(
        "p",
        { className: "quiz__points" },
        `Name +${points.name.toLocaleString()} · Location +${points.location.toLocaleString()} · `,
        el("strong", {}, `+${answer.points.toLocaleString()} points`),
      ),
      el("p", {}, `Photographed ${question.place ? `in ${question.place}` : "here"}${question.date ? ` on ${question.date}` : ""}.`),
      el("button", { type: "button", className: "button", onclick: onNext }, isLast ? "See your score" : "Next mammal"),
    );
  });

  return map;
}

function results(stage: HTMLElement, quiz: DailyQuiz, answers: Answer[], speciesByKey: Map<number, SpeciesSummary>): () => void {
  const next = nextQuizAt(new Date());
  const cards = { hours: countdownCard("Hours"), minutes: countdownCard("Minutes"), seconds: countdownCard("Seconds") };
  const countdown = el("div", { className: "countdown" }, cards.hours.element, cards.minutes.element, cards.seconds.element);
  const update = () => {
    const now = new Date();
    if (now >= next) {
      window.clearInterval(tick);
      countdown.replaceWith(el("button", { type: "button", className: "button", onclick: () => window.location.reload() }, "Play today's quiz"));
      return;
    }
    const left = timeUntil(now, next);
    for (const unit of ["hours", "minutes", "seconds"] as const) cards[unit].value.textContent = String(left[unit]).padStart(2, "0");
  };
  const tick = window.setInterval(update, COUNTDOWN_TICK_MS);
  update();
  const maxPoints = quiz.questions.length * POINTS_PER_QUESTION;

  stage.replaceChildren(
    el(
      "div",
      { className: "quiz__results" },
      el("p", { className: "quiz__score", role: "status" }, `${totalPoints(answers).toLocaleString()} / ${maxPoints.toLocaleString()} points`),
      el(
        "table",
        { className: "quiz__breakdown" },
        el(
          "thead",
          {},
          el("tr", {}, el("th", {}, "Mammal"), el("th", {}, "Name"), el("th", {}, "Distance"), el("th", {}, "Points")),
        ),
        el(
          "tbody",
          {},
          ...quiz.questions.map((question, i) => {
            const answer = answers[i];
            const species = speciesByKey.get(question.speciesKey);
            return el(
              "tr",
              {},
              el("td", {}, species ? el("a", { href: routes.species(species.gbifKey) }, species.commonName) : "Unknown"),
              el("td", { title: answer?.nameCorrect ? "Named correctly" : "Not named" }, answer?.nameCorrect ? "✓" : "✗"),
              el("td", {}, answer ? `${Math.round(answer.km).toLocaleString()} km` : "—"),
              el("td", {}, (answer?.points ?? 0).toLocaleString()),
            );
          }),
        ),
      ),
      el(
        "section",
        { className: "quiz__next", ariaLabel: "Time until the next quiz" },
        el("h3", {}, "Next quiz in"),
        countdown,
        el("p", { className: "quiz__next-note" }, "A new quiz starts for everyone at midnight Eastern Time."),
      ),
    ),
  );

  return () => window.clearInterval(tick);
}

function countdownCard(label: string): { element: HTMLElement; value: HTMLElement } {
  const value = el("span", { className: "countdown__value" });
  return { element: el("div", { className: "countdown__card" }, value, el("span", { className: "countdown__label" }, label)), value };
}

function totalPoints(answers: Answer[]): number {
  return answers.reduce((total, answer) => total + answer.points, 0);
}
