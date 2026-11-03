// Which actions this version offers, and their defaults. Read by popup.js and the bookmarklet panel.
globalThis.CADMUS_UI = {
  title: 'Cadmus Exam Setup',
  storageKey: 'cadmusSetupOptions',
  fields: [
    { key: 'examType', type: 'toggle', label: 'Assessment type Exam, exam type Final exam', default: { enabled: true } },
    {
      key: 'shiftStart',
      type: 'number',
      label: 'Move exam start',
      directions: [
        { value: 'earlier', label: 'earlier by' },
        { value: 'later', label: 'later by' },
      ],
      unit: 'min',
      default: { enabled: false, value: 2, direction: 'earlier' },
    },
    {
      key: 'extendWriting',
      type: 'number',
      label: 'Writing time:',
      directions: [
        { value: 'add', label: 'add' },
        { value: 'subtract', label: 'subtract' },
      ],
      unit: 'min',
      default: { enabled: false, value: 2, direction: 'add' },
    },
    {
      key: 'autoSubmission',
      type: 'number',
      label: 'Auto Submission off, late submission limit',
      unit: 'min',
      default: { enabled: true, value: 30 },
    },
    { key: 'marking', type: 'toggle', label: 'Marking tool: Turnitin Feedback Studio', default: { enabled: true } },
    { key: 'totalPoints', type: 'number', label: 'Total points', unit: 'points', default: { enabled: true, value: 100 } },
    { key: 'spellCheck', type: 'toggle', label: 'Spell Check on', default: { enabled: true } },
    {
      key: 'proctoring',
      type: 'choice',
      label: 'Advanced exam settings: turn on',
      choices: [
        { value: 'schoolyear', label: 'Schoolyear' },
        { value: 'lockdown', label: 'Lockdown' },
      ],
      default: { enabled: true, choice: 'schoolyear' },
    },
  ],
};
