import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import UltrasonicSlumpCapture from "./UltrasonicSlumpCapture";
import { getLatestReading, sendRecordingEvent } from "../services/api";

jest.mock("../services/api", () => ({
  getLatestReading: jest.fn(),
  sendRecordingEvent: jest.fn(),
}));

beforeEach(() => {
  sendRecordingEvent.mockResolvedValue({ success: true });
});

test("fills the slump from the last ultrasonic reading taken during capture", async () => {
  getLatestReading
    .mockResolvedValueOnce({ data: { id: 1, distance_cm: 4, recorded_at: "2026-10-07T10:00:00Z" } })
    .mockResolvedValue({ data: { id: 2, distance_cm: 11.5, recorded_at: "2026-10-07T10:01:00Z" } });
  const onCaptured = jest.fn();
  render(<UltrasonicSlumpCapture onCaptured={onCaptured} />);

  fireEvent.click(screen.getByRole("button", { name: "Start capture" }));
  fireEvent.click(await screen.findByRole("button", { name: "Stop capture" }));

  await waitFor(() => expect(onCaptured).toHaveBeenCalledWith(115, expect.objectContaining({ id: 2 })));
  expect(sendRecordingEvent).toHaveBeenNthCalledWith(1, "start");
  expect(sendRecordingEvent).toHaveBeenNthCalledWith(2, "stop");
});

test("ignores readings from before the capture started", async () => {
  getLatestReading.mockResolvedValue({ data: { id: 1, distance_cm: 4, recorded_at: "2026-10-07T10:00:00Z" } });
  const onCaptured = jest.fn();
  render(<UltrasonicSlumpCapture onCaptured={onCaptured} />);

  fireEvent.click(screen.getByRole("button", { name: "Start capture" }));
  fireEvent.click(await screen.findByRole("button", { name: "Stop capture" }));

  expect(await screen.findByRole("alert")).toHaveTextContent("No ultrasonic reading was received");
  expect(onCaptured).not.toHaveBeenCalled();
});
