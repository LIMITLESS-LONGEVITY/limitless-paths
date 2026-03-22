export type BlockContext =
  | { type: 'activity'; uuid: string; courseUuid: string }
  | { type: 'article'; uuid: string }
