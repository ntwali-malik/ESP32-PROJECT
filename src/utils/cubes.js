import { getCompressionTests } from "../services/api";

export function getTestImageUrl(test) {
  return (
    test?.cube_image_url ||
    test?.image_url ||
    test?.cube_image ||
    test?.image ||
    ""
  );
}

export function sortCompressionTests(tests = []) {
  return [...tests].sort((left, right) => {
    const rightTime = new Date(right.created_at || right.test_date).getTime();
    const leftTime = new Date(left.created_at || left.test_date).getTime();
    return rightTime - leftTime;
  });
}

export function formatTestDate(value) {
  if (!value) return "No test date";
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatMeasure(value, unit) {
  const number = Number(value);
  if (Number.isNaN(number)) return `-- ${unit}`;
  return `${number.toFixed(2)} ${unit}`;
}

export async function loadCompressionTests(qrToken) {
  const response = await getCompressionTests(qrToken);
  return sortCompressionTests(response.data || []);
}
