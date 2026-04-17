import type { EvalItem } from "@/types";

/** Hardcoded evaluation set: 10 items across factual, reasoning, and knowledge domains */
export const EVAL_DATASET: EvalItem[] = [
  {
    input: "What is the capital of France?",
    expected_output: "Paris",
  },
  {
    input: "What is the speed of light in vacuum (approximate value in m/s)?",
    expected_output: "~299,792,458 m/s",
  },
  {
    input: "Who wrote Romeo and Juliet?",
    expected_output: "William Shakespeare",
  },
  {
    input: "What is the square root of 144?",
    expected_output: "12",
  },
  {
    input: "What year did World War II end?",
    expected_output: "1945",
  },
  {
    input: "What is the chemical symbol for gold?",
    expected_output: "Au",
  },
  {
    input: "Which planet is known as the Red Planet?",
    expected_output: "Mars",
  },
  {
    input: "What is often called the powerhouse of the cell?",
    expected_output: "The mitochondria",
  },
  {
    input: "Who painted the Mona Lisa?",
    expected_output: "Leonardo da Vinci",
  },
  {
    input: "What is the sum of the interior angles of a triangle in Euclidean geometry?",
    expected_output: "180 degrees",
  },
];
