/**
 * LINE Conveyor Calculator Bot — menu-driven version
 * ----------------------------------------------------------------------------
 * Main menu (Quick Reply buttons):
 *   1. Input      → first time: ask every field one-by-one
 *                   later:      ask WHICH field to edit, then the new value
 *   2. Segments   → add / edit / delete conveyor segments one-by-one
 *   3. Output     → send a browser link that opens the full HTML calculator
 *                   (profile visualization + all output tabs)
 *
 * The bot keeps everything in a per-user session. Inputs not yet set use the
 * field defaults automatically when building the link.
 *
 * Env vars:
 *   CHANNEL_ACCESS_TOKEN, CHANNEL_SECRET, CALCULATOR_URL, PORT(optional)
 */

const express = require('express');
const line = require('@line/bot-sdk');
const { FIELDS, SEGMENT_FIELDS } = require('./fields');

const config = {
  channelAccessToken: process.env.CHANNEL_ACCESS_TOKEN,
  channelSecret: process.env.CHANNEL_SECRET,
};
const CALCULATOR_URL = process.env.CALCULATOR_URL || 'https://EXAMPLE.com/conveyor_calculator.html';

const client = new line.Client(config);
const app = express();

// ---------------------------------------------------------------------------
// Session store (in memory). userId -> session
// ---------------------------------------------------------------------------
const sessions = {};

function newSession() {
  return {
    stage: 'menu',        // menu | inputFirst | inputEditPick | inputEditValue
                          //      | segMenu | segField | segEditPick | done
    inputs: {},           // collected global inputs (id -> number)
    inputIdx: 0,          // index while asking all inputs the first time
    inputsDone: false,    // have we completed the first full pass?
    editId: null,         // which input id is being edited
    segs: [],             // array of {L,h_end,l0,lu,trough}
    curSeg: {},           // segment being built
    segFieldIdx: 0,
    segEditIdx: null,     // which segment index is being edited
  };
}

// ---------------------------------------------------------------------------
// Quick Reply helpers
// ---------------------------------------------------------------------------
function qr(labels) {
  // labels: array of strings OR {label,text}. Max 13 items in LINE.
  return {
    items: labels.slice(0, 13).map(l => {
      const label = typeof l === 'string' ? l : l.label;
      const text = typeof l === 'string' ? l : (l.text || l.label);
      return { type: 'action', action: { type: 'message', label: label.slice(0, 20), text } };
    }),
  };
}

function msg(text, quickReply) {
  const m = { type: 'text', text };
  if (quickReply) m.quickReply = quickReply;
  return m;
}

// ---------------------------------------------------------------------------
// Prompt builders
// ---------------------------------------------------------------------------
function mainMenu() {
  return msg(
    'What would you like to do?',
    qr([
      { label: '1. Input', text: 'input' },
      { label: '2. Segments', text: 'segments' },
      { label: '3. Output', text: 'output' },
    ])
  );
}

function fieldPrompt(f, idx, total) {
  const head = total ? `(${idx + 1}/${total}) ` : '';
  const unit = f.unit && f.unit !== '-' ? ` [${f.unit}]` : '';
  const def = f.def === null
    ? 'required — type a number'
    : `default ${f.def}${f.unit && f.unit !== '-' ? ' ' + f.unit : ''}`;
  const grp = f.group ? `── ${f.group} ──\n` : '';
  return msg(
    `${grp}${head}${f.label}${unit}\n(${def})`,
    f.def === null
      ? qr([{ label: '✖ Cancel', text: 'cancel' }])
      : qr([{ label: '↩ Use default', text: '-' }, { label: '✖ Cancel', text: 'cancel' }])
  );
}

function segFieldPrompt(f, idx) {
  const unit = f.unit && f.unit !== '-' ? ` [${f.unit}]` : '';
  const def = f.def === null ? 'required' : `default ${f.def}`;
  return msg(
    `(${idx + 1}/${SEGMENT_FIELDS.length}) ${f.label}${unit}\n(${def})`,
    f.def === null
      ? qr([{ label: '✖ Cancel', text: 'cancel' }])
      : qr([{ label: '↩ Use default', text: '-' }, { label: '✖ Cancel', text: 'cancel' }])
  );
}

// list inputs as quick-reply choices to edit (chunked — LINE max 13)
function inputEditMenu(session, page = 0) {
  const perPage = 11;
  const start = page * perPage;
  const slice = FIELDS.slice(start, start + perPage);
  const items = slice.map(f => {
    const cur = session.inputs[f.id] != null ? session.inputs[f.id] : f.def;
    return { label: `${f.id}=${cur}`.slice(0, 20), text: `edit:${f.id}` };
  });
  if (start + perPage < FIELDS.length) items.push({ label: '▶ More', text: `editpage:${page + 1}` });
  items.push({ label: '✖ Done', text: 'menu' });
  return msg('Which input do you want to edit? (showing current values)', qr(items));
}

// ---------------------------------------------------------------------------
// Value parsing
// ---------------------------------------------------------------------------
function parseValue(text, f) {
  const t = (text || '').trim().toLowerCase();
  if (t === '-' || t === 'd' || t === 'default' || t === 'def') {
    if (f.def === null) return { ok: false, reason: 'no_default' };
    return { ok: true, value: f.def };
  }
  const v = Number(t.replace(/,/g, ''));
  if (Number.isNaN(v)) return { ok: false, reason: 'nan' };
  return { ok: true, value: v };
}

// ---------------------------------------------------------------------------
// Build the calculator link from current session
// ---------------------------------------------------------------------------
function buildStateLink(session) {
  const inputs = {};
  for (const f of FIELDS) {
    const v = session.inputs[f.id] != null ? session.inputs[f.id] : f.def;
    inputs[f.id] = String(v);
  }
  let segs = session.segs.length ? session.segs : [{ L: 100, h_end: 0, l0: 1.5, lu: 6, trough: 45 }];
  segs = segs.map(s => ({
    L: Number(s.L), h_end: Number(s.h_end || 0), dH: Number(s.h_end || 0),
    l0: Number(s.l0 != null ? s.l0 : 1.5), lu: Number(s.lu != null ? s.lu : 6),
    trough: Number(s.trough != null ? s.trough : 45),
  }));
  const state = {
    inputs, segs,
    liftHead: Number(inputs.liftHead || 0),
    overrides: [], bearingOverride: {}, reducerIAuto: true, takeupType: 'gravity-tail',
  };
  const b64 = Buffer.from(JSON.stringify(state), 'utf8').toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${CALCULATOR_URL}?state=${b64}`;
}

// ---------------------------------------------------------------------------
// Conversation handler — returns an array of LINE message objects
// ---------------------------------------------------------------------------
function handle(session, textRaw) {
  const text = (textRaw || '').trim();
  const low = text.toLowerCase();

  // Global commands available anywhere
  if (low === 'cancel' || low === 'menu' || low === 'ยกเลิก') {
    session.stage = 'menu';
    session.editId = null; session.segEditIdx = null; session.curSeg = {}; session.segFieldIdx = 0;
    return [mainMenu()];
  }
  if (low === 'start' || low === 'help' || low === 'hi' || low === 'hello' || low === 'เริ่ม') {
    session.stage = 'menu';
    return [
      msg('Conveyor Calculator bot.\n• 1 Input — set or edit values\n• 2 Segments — manage conveyor profile\n• 3 Output — get the results link\nType "menu" anytime.'),
      mainMenu(),
    ];
  }

  switch (session.stage) {

    // ---------------- MAIN MENU ----------------
    case 'menu': {
      if (low === 'input' || low === '1') {
        if (!session.inputsDone) {
          // first time → ask everything one-by-one
          session.stage = 'inputFirst';
          session.inputIdx = 0;
          return [msg('Entering all inputs. Type a number, or use the default button.'), fieldPrompt(FIELDS[0], 0, FIELDS.length)];
        }
        // later → ask which to edit
        session.stage = 'inputEditPick';
        return [inputEditMenu(session, 0)];
      }
      if (low === 'segments' || low === '2') {
        session.stage = 'segMenu';
        return [segMenu(session)];
      }
      if (low === 'output' || low === '3') {
        const link = buildStateLink(session);
        const nSet = Object.keys(session.inputs).length;
        return [
          msg(`Here is your calculated conveyor (profile visualization + all outputs):`),
          msg(link),
          msg(`${nSet} input(s) set, ${session.segs.length} segment(s). Tap the link to view and interact with the full results.`, qr([{ label: '☰ Menu', text: 'menu' }])),
        ];
      }
      return [mainMenu()];
    }

    // ---------------- INPUT: first full pass ----------------
    case 'inputFirst': {
      const f = FIELDS[session.inputIdx];
      if (low === 'back') {
        session.inputIdx = Math.max(0, session.inputIdx - 1);
        return [fieldPrompt(FIELDS[session.inputIdx], session.inputIdx, FIELDS.length)];
      }
      const p = parseValue(text, f);
      if (!p.ok) {
        return [msg(p.reason === 'no_default' ? 'This one needs a number.' : 'Please type a number (or use the default button).'), fieldPrompt(f, session.inputIdx, FIELDS.length)];
      }
      session.inputs[f.id] = p.value;
      session.inputIdx++;
      if (session.inputIdx < FIELDS.length) {
        return [fieldPrompt(FIELDS[session.inputIdx], session.inputIdx, FIELDS.length)];
      }
      // finished first pass
      session.inputsDone = true;
      session.stage = 'menu';
      return [
        msg('✓ All inputs saved. You can edit any value later from the Input menu.'),
        mainMenu(),
      ];
    }

    // ---------------- INPUT: pick which to edit ----------------
    case 'inputEditPick': {
      if (low.startsWith('editpage:')) {
        const pg = parseInt(low.split(':')[1], 10) || 0;
        return [inputEditMenu(session, pg)];
      }
      if (low.startsWith('edit:')) {
        const id = text.split(':')[1];
        const f = FIELDS.find(x => x.id === id);
        if (!f) return [inputEditMenu(session, 0)];
        session.editId = id;
        session.stage = 'inputEditValue';
        const cur = session.inputs[id] != null ? session.inputs[id] : f.def;
        const unit = f.unit && f.unit !== '-' ? ` [${f.unit}]` : '';
        return [msg(`${f.label}${unit}\nCurrent: ${cur}\nType the new value:`, qr([{ label: '✖ Cancel', text: 'menu' }]))];
      }
      return [inputEditMenu(session, 0)];
    }

    // ---------------- INPUT: enter the new value ----------------
    case 'inputEditValue': {
      const f = FIELDS.find(x => x.id === session.editId);
      const p = parseValue(text, f);
      if (!p.ok) return [msg('Please type a number.')];
      session.inputs[f.id] = p.value;
      session.editId = null;
      session.stage = 'inputEditPick';
      return [msg(`✓ ${f.id} = ${p.value}`), inputEditMenu(session, 0)];
    }

    // ---------------- SEGMENTS menu ----------------
    case 'segMenu': {
      if (low === 'addseg' || low === 'add') {
        session.curSeg = {}; session.segFieldIdx = 0; session.segEditIdx = null;
        session.stage = 'segField';
        return [msg(`Adding segment ${session.segs.length + 1}.`), segFieldPrompt(SEGMENT_FIELDS[0], 0)];
      }
      if (low.startsWith('editseg:')) {
        const i = parseInt(low.split(':')[1], 10);
        if (i >= 0 && i < session.segs.length) {
          session.curSeg = {}; session.segFieldIdx = 0; session.segEditIdx = i;
          session.stage = 'segField';
          return [msg(`Editing segment ${i + 1} (re-enter its values).`), segFieldPrompt(SEGMENT_FIELDS[0], 0)];
        }
        return [segMenu(session)];
      }
      if (low.startsWith('delseg:')) {
        const i = parseInt(low.split(':')[1], 10);
        if (i >= 0 && i < session.segs.length) session.segs.splice(i, 1);
        return [msg('✓ Segment deleted.'), segMenu(session)];
      }
      return [segMenu(session)];
    }

    // ---------------- SEGMENT field entry ----------------
    case 'segField': {
      const sf = SEGMENT_FIELDS[session.segFieldIdx];
      const p = parseValue(text, sf);
      if (!p.ok) {
        return [msg(p.reason === 'no_default' ? 'This one is required — type a number.' : 'Please type a number (or use default).'), segFieldPrompt(sf, session.segFieldIdx)];
      }
      session.curSeg[sf.id] = p.value;
      session.segFieldIdx++;
      if (session.segFieldIdx < SEGMENT_FIELDS.length) {
        return [segFieldPrompt(SEGMENT_FIELDS[session.segFieldIdx], session.segFieldIdx)];
      }
      // finished one segment
      if (session.segEditIdx != null) {
        session.segs[session.segEditIdx] = { ...session.curSeg };
      } else {
        session.segs.push({ ...session.curSeg });
      }
      session.curSeg = {}; session.segFieldIdx = 0; session.segEditIdx = null;
      session.stage = 'segMenu';
      return [msg('✓ Segment saved.'), segMenu(session)];
    }

    default:
      session.stage = 'menu';
      return [mainMenu()];
  }
}

// Segment menu builder (depends on current segs)
function segMenu(session) {
  const lines = session.segs.length
    ? session.segs.map((s, i) => `${i + 1}. L=${s.L} ΔH=${s.h_end} trough=${s.trough}`).join('\n')
    : '(no segments yet)';
  const items = [{ label: '➕ Add segment', text: 'addseg' }];
  session.segs.forEach((_, i) => {
    items.push({ label: `✎ Edit ${i + 1}`, text: `editseg:${i}` });
    items.push({ label: `🗑 Delete ${i + 1}`, text: `delseg:${i}` });
  });
  items.push({ label: '☰ Menu', text: 'menu' });
  return msg(`Segments:\n${lines}`, qr(items));
}

// ---------------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------------
app.post('/webhook', line.middleware(config), async (req, res) => {
  try {
    await Promise.all((req.body.events || []).map(onEvent));
    res.status(200).end();
  } catch (e) { console.error('webhook error', e); res.status(500).end(); }
});

async function onEvent(event) {
  if (event.type === 'follow' && event.replyToken) {
    return client.replyMessage(event.replyToken, [
      msg('Welcome to the Conveyor Calculator bot!'),
      mainMenu(),
    ]);
  }
  if (event.type !== 'message' || event.message.type !== 'text') return null;

  const userId = (event.source && event.source.userId) || 'anon';
  if (!sessions[userId]) sessions[userId] = newSession();
  const session = sessions[userId];

  const messages = handle(session, event.message.text).slice(0, 5);
  return client.replyMessage(event.replyToken, messages);
}

app.get('/', (_req, res) => res.send('Conveyor LINE bot (menu version) is running.'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Conveyor LINE bot listening on :${PORT}`));

module.exports = { handle, newSession, buildStateLink };
