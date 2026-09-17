import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { videosApi, VideoGenerationRequest, VIDEO_TEMPLATE_CHOICES } from '../api/videos'

export function useVideos() {
  return useQuery({
    queryKey: ['videos'],
    queryFn: () => videosApi.listEpisodes(),
    refetchInterval: (query) => {
      const episodes = query.state.data
      const hasActive = episodes?.some(episode =>
        ['running', 'processing', 'pending', 'submitted'].includes(episode.job_status ?? '')
      )
      return hasActive ? 2_000 : 5_000
    },
    refetchOnWindowFocus: true,
  })
}

export function useVideoTemplates() {
  return useQuery({
    queryKey: ['video-templates'],
    queryFn: () => videosApi.listTemplates(),
    initialData: { templates: [...VIDEO_TEMPLATE_CHOICES], default: 'auto' },
    staleTime: Infinity,
  })
}

export function useGenerateVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (request: VideoGenerationRequest) => videosApi.generateVideo(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}

export function useDeleteVideo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (episodeId: string) => videosApi.deleteEpisode(episodeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['videos'] })
    },
  })
}

export function useVideoJobStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['video-job', jobId],
    queryFn: () => videosApi.getJobStatus(jobId!),
    enabled: !!jobId,
    refetchInterval: (query) => {
      const status = query.state?.data?.status
      if (
        status === 'completed' ||
        status === 'error' ||
        status === 'failed' ||
        status === 'cancelled'
      ) {
        return false
      }
      return 2000 // Poll every 2s
    },
  })
}
