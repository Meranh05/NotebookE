import apiClient from './client'
import { getApiUrl } from '@/lib/config'

export interface VideoEpisode {
  id: string
  name: string
  notebook_id?: string
  prompt: string
  video_file?: string
  video_url?: string
  created?: string
  job_status?: string
  error_message?: string
  command_id?: string
}

export interface VideoGenerationRequest {
  name: string
  content?: string
  notebook_id?: string
  n_scenes?: number
  duration_minutes?: 1 | 3 | 5
  image_workflow?: string
  visual_mode?: string
  tts_voice?: string
  language?: string
  video_type?: string
  style?: string
  character_id?: string
  custom_prompt?: string
  aspect_ratio?: string
}

export interface VideoGenerationResponse {
  job_id: string
  status: string
  message: string
  name: string
}

export async function resolveVideoAssetUrl(path?: string | null): Promise<string | undefined> {
  if (!path) {
    return undefined
  }
  if (/^https?:\/\//i.test(path)) {
    return path
  }
  const base = await getApiUrl()
  if (path.startsWith('/')) {
    return `${base}${path}`
  }
  return `${base}/${path}`
}

export const videosApi = {
  listEpisodes: async () => {
    const response = await apiClient.get<VideoEpisode[]>('/videos/episodes')
    return response.data
  },

  generateVideo: async (payload: VideoGenerationRequest) => {
    const response = await apiClient.post<VideoGenerationResponse>(
      '/videos/generate',
      payload
    )
    return response.data
  },

  deleteEpisode: async (episodeId: string) => {
    const response = await apiClient.delete(`/videos/episodes/${episodeId}`)
    return response.data
  },

  getJobStatus: async (jobId: string) => {
    const response = await apiClient.get<{ status: string; result?: unknown; error_message?: string }>(
      `/videos/jobs/${jobId}`
    )
    return response.data
  },
}
