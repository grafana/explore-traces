import { FieldType } from '@grafana/data';
import { doesQueryMatchDataFrameLabels } from 'components/Explore/ByFrameRepeater';

const DATA_FRAME_FIELDS = [
  {
    type: FieldType.number,
    config: {},
    values: [],
    name: '{resource.service.name="mythical-requester", status="error"}',
    labels: { 'resource.service.name': '"mythical-requester"', status: '"error"' },
  },
  {
    type: FieldType.number,
    config: {},
    values: [],
    name: '{resource.service.name="mythical-requester", status="ok"}',
    labels: { 'resource.service.name': '"mythical-requester"', status: '"ok"' },
  },
];

describe('doesQueryMatchDataFrameLabels', () => {
  describe('when there are no fields in the data frame', () => {
    test('returns false', () => {
      expect(doesQueryMatchDataFrameLabels('needle')({ fields: [], length: 0 })).toBe(false);
    });
  });

  describe('when there are fields in the data frame', () => {
    test.each([
      [
        'no labels in the fields',
        'requester',
        false,
        [
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="mythical-requester", status="error"}',
            labels: undefined,
          },
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="mythical-requester", status="ok"}',
            labels: undefined,
          },
        ],
      ],
      ['labels in the fields & an empty search query', '', true, DATA_FRAME_FIELDS],
      ['labels in the fields & a search match', 'requester', true, DATA_FRAME_FIELDS],
      ['labels in the fields & a search query with spaces around', '  requester  ', true, DATA_FRAME_FIELDS],
      [
        'labels in the fields & a case-sensitive search match (#1)',
        'MYTHICAL',
        true,
        [
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="mythical-requester", status="error"}',
            labels: { 'resource.service.name': '"mythical-requester"', status: '"error"' },
          },
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="MYTHICAL-requester", status="ok"}',
            labels: { 'resource.service.name': '"MYTHICAL-requester"', status: '"ok"' },
          },
        ],
      ],
      [
        'labels in the fields & a case-sensitive search match (#2)',
        'mythical',
        true,
        [
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="MYTHICAL-requester", status="error"}',
            labels: { 'resource.service.name': '"MYTHICAL-requester"', status: '"error"' },
          },
          {
            type: FieldType.number,
            config: {},
            values: [],
            name: '{resource.service.name="MYTHICAL-requester", status="ok"}',
            labels: { 'resource.service.name': '"MYTHICAL-requester"', status: '"ok"' },
          },
        ],
      ],
    ])('%s, "%s" → %s', (_, searchQuery, expectedOutput, fields) => {
      expect(doesQueryMatchDataFrameLabels(searchQuery)({ fields, length: 42 })).toBe(expectedOutput);
    });
  });
});
