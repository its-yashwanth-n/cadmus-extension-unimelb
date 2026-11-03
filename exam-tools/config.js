// Which actions this version offers, and their defaults. Read by popup.js and the bookmarklet panel.
globalThis.CADMUS_UI = {
  title: 'Cadmus Exam Tools',
  storageKey: 'cadmusToolsOptions',
  fields: [
    {
      key: 'shiftStart',
      type: 'number',
      label: 'Move exam start',
      directions: [
        { value: 'earlier', label: 'earlier by' },
        { value: 'later', label: 'later by' },
      ],
      unit: 'min',
      default: { enabled: true, value: 2, direction: 'earlier' },
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
      default: { enabled: true, value: 2, direction: 'add' },
    },
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
