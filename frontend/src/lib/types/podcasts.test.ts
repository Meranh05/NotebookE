import { describe, expect, it } from 'vitest'

import { dedupePodcastEpisodes, type PodcastEpisode } from './podcasts'

function episode(overrides: Partial<PodcastEpisode>): PodcastEpisode {
  return {
    id: 'episode:1',
    name: 'Notebook Podcast',
    episode_profile: {
      id: 'episode_profile:1',
      name: 'business_analysis',
      description: '',
      speaker_config: 'speaker_profile:1',
      default_briefing: '',
      num_segments: 3,
    },
    speaker_profile: {
      id: 'speaker_profile:1',
      name: 'Presenters',
      description: '',
      speakers: [],
    },
    briefing: '',
    created: '2026-09-13T20:20:10Z',
    job_status: 'running',
    ...overrides,
  }
}

describe('dedupePodcastEpisodes', () => {
  it('keeps only one row for the same worker command', () => {
    const episodes = dedupePodcastEpisodes([
      episode({ id: 'episode:2', command_id: 'command:1' }),
      episode({ id: 'episode:1', command_id: 'command:1' }),
    ])

    expect(episodes.map(item => item.id)).toEqual(['episode:2'])
  })

  it('collapses rapid identical submissions but keeps later intentional ones', () => {
    const episodes = dedupePodcastEpisodes([
      episode({ id: 'episode:2', command_id: 'command:2' }),
      episode({ id: 'episode:1', command_id: 'command:1', created: '2026-09-13T20:20:45Z' }),
      episode({ id: 'episode:3', command_id: 'command:3', created: '2026-09-13T20:21:01Z' }),
    ])

    expect(episodes.map(item => item.id)).toEqual(['episode:2', 'episode:3'])
  })
})
