import { Router, Request, Response } from 'express';
import twilio from 'twilio';
import * as callService from '../services/callService';
import * as twilioMonitor from '../services/twilioMonitor';

const router = Router();
const VoiceResponse = twilio.twiml.VoiceResponse;

function logForm(source: string, body: Record<string, string>): void {
  const filtered = Object.fromEntries(Object.entries(body).filter(([, v]) => v !== ''));
  twilioMonitor.logEvent(source, filtered);
}

// ── INBOUND ───────────────────────────────────────────────────────────────────

router.post('/inbound/webhook', (req: Request, res: Response) => {
  const { CallSid, From, To } = req.body;
  logForm('inbound_webhook', { CallSid, From, To, CallStatus: 'ringing' });

  const twiml = new VoiceResponse();
  twiml.say({ language: 'vi-VN' }, 'Xin chào, đây là trợ lý AI dành cho tài xế. Vui lòng chờ một chút.');
  twiml.record({
    action: '/api/v1/calls/inbound/recorded',
    recordingStatusCallback: '/api/v1/calls/inbound/recording-status',
    timeout: 10,
    transcribe: true,
    transcribeCallback: '/api/v1/calls/inbound/transcription',
  });
  res.type('text/xml').send(twiml.toString());
});

router.post('/inbound/recorded', (req: Request, res: Response) => {
  const { CallSid, RecordingUrl = '', RecordingDuration = '' } = req.body;
  console.log(`[Inbound] Recording done: ${CallSid} | url=${RecordingUrl} | dur=${RecordingDuration}s`);

  const twiml = new VoiceResponse();
  twiml.say({ language: 'vi-VN' }, 'Cuộc gọi đã được ghi lại. Cảm ơn bạn!');
  twiml.hangup();
  res.type('text/xml').send(twiml.toString());
});

router.post('/inbound/recording-status', (req: Request, res: Response) => {
  const { CallSid, RecordingStatus = '', RecordingUrl = '' } = req.body;
  console.log(`[Inbound] Recording status: ${CallSid} | ${RecordingStatus} | ${RecordingUrl}`);
  res.json({ status: 'ok' });
});

router.post('/inbound/transcription', (req: Request, res: Response) => {
  const { CallSid, TranscriptionText = '', TranscriptionStatus = '' } = req.body;
  console.log(`[Inbound] Transcription [${TranscriptionStatus}]: ${TranscriptionText}`);
  // TODO: send transcript to GPT-4o for summary
  res.json({ status: 'ok' });
});

router.post('/inbound/status', (req: Request, res: Response) => {
  const { CallSid, CallStatus, Duration = '', From = '', To = '' } = req.body;
  logForm('inbound_status', { CallSid, CallStatus, Duration, From, To });
  res.json({ status: 'ok' });
});

// ── OUTBOUND ──────────────────────────────────────────────────────────────────

router.post('/outbound/twiml', (_req: Request, res: Response) => {
  const twiml = new VoiceResponse();
  twiml.say({ language: 'vi-VN' },
    'Xin chào tài xế! Đây là thông báo từ hệ thống quản lý chuyến xe. Bạn có chuyến đón khách trong 15 phút nữa.'
  );
  twiml.pause({ length: 1 });
  twiml.say({ language: 'vi-VN' }, 'Bấm phím 1 để xác nhận chuyến đi. Bấm phím 2 để từ chối.');
  twiml.gather({ numDigits: 1, action: '/api/v1/calls/outbound/gather', method: 'POST', timeout: 10 });
  twiml.say({ language: 'vi-VN' }, 'Không có phản hồi. Kết thúc cuộc gọi.');
  twiml.hangup();
  res.type('text/xml').send(twiml.toString());
});

router.post('/outbound/gather', (req: Request, res: Response) => {
  const { CallSid, Digits = '' } = req.body;
  console.log(`[Outbound] Gather: ${CallSid} | Digits=${Digits}`);

  const twiml = new VoiceResponse();
  if (Digits === '1') {
    twiml.say({ language: 'vi-VN' }, 'Đã xác nhận chuyến đi. Cảm ơn tài xế!');
    // TODO: update trip status to confirmed in DB
  } else if (Digits === '2') {
    twiml.say({ language: 'vi-VN' }, 'Đã từ chối chuyến đi. Hẹn gặp lại!');
    // TODO: update trip status to rejected in DB
  } else {
    twiml.say({ language: 'vi-VN' }, 'Lựa chọn không hợp lệ. Kết thúc cuộc gọi.');
  }
  twiml.hangup();
  res.type('text/xml').send(twiml.toString());
});

router.post('/outbound/status', (req: Request, res: Response) => {
  const { CallSid, CallStatus, To, Duration = '', From = '' } = req.body;
  logForm('outbound_status', { CallSid, CallStatus, To, From, Duration });
  res.json({ status: 'ok' });
});

// ── REST ──────────────────────────────────────────────────────────────────────

router.post('/outbound/dial', async (req: Request, res: Response) => {
  const { to_number } = req.body;
  if (!to_number) return res.json({ error: 'to_number is required' });
  try {
    const callSid = await callService.makeOutboundCall(to_number);
    return res.json({ call_sid: callSid, status: 'initiated' });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/status/:callSid', async (req: Request, res: Response) => {
  try {
    return res.json(await callService.getCallStatus(req.params.callSid));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/recent', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 20, 100);
    return res.json(await callService.listCalls(limit));
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/twilio', async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const direction = req.query.direction ? String(req.query.direction) : undefined;
    const status = req.query.status ? String(req.query.status) : undefined;
    const calls = await callService.listCalls(limit, direction, status);
    return res.json({ calls, count: limit });
  } catch (err) {
    return res.status(500).json({ error: String(err) });
  }
});

router.get('/events', (req: Request, res: Response) => {
  const limit = Math.min(Number(req.query.limit) || 200, 1000);
  const callSid = req.query.call_sid ? String(req.query.call_sid) : undefined;
  const events = twilioMonitor.readEvents(limit, callSid);
  return res.json({ events, count: events.length });
});

router.get('/monitor/:callSid', async (req: Request, res: Response) => {
  const { callSid } = req.params;
  let live: unknown;
  try {
    live = await callService.getCallStatus(callSid);
  } catch (err) {
    live = { error: String(err) };
  }
  const events = twilioMonitor.readEvents(500, callSid);
  return res.json({ call_sid: callSid, twilio: live, events });
});

export default router;
