/**
 * Zustand Store with Async Actions
 *
 * Use when:
 * - Fetching data from APIs
 * - Need loading/error states
 * - Handling async operations
 *
 * Pattern: Actions can be async, just call set() when done
 *
 * Features:
 * - Loading states
 * - Error handling
 * - Optimistic updates
 * - Request cancellation
 *
 * NOTE: For server state (data fetching), consider TanStack Query instead!
 * Zustand is better for client state. But this pattern works for simple cases.
 *
 * Learn more: See SKILL.md Common Patterns section
 */

import axios from 'axios'
import { create } from 'zustand'

interface User {
  id: string
  name: string
  email: string
}

interface Post {
  id: string
  title: string
  body: string
  userId: string
}

type CreatePostInput = Omit<Post, 'id'>

const apiClient = axios.create({
  baseURL: 'https://api.example.com',
  headers: {
    'Content-Type': 'application/json',
  },
})

function getErrorMessage(error: unknown, fallback: string) {
  if (axios.isAxiosError(error)) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return fallback
}

interface AsyncStore {
  // Data state
  user: User | null
  posts: Post[]

  // Loading states
  isLoadingUser: boolean
  isLoadingPosts: boolean
  isSavingPost: boolean

  // Error states
  userError: string | null
  postsError: string | null
  saveError: string | null

  // Actions
  fetchUser: (userId: string) => Promise<void>
  fetchPosts: (userId: string) => Promise<void>
  createPost: (post: CreatePostInput) => Promise<void>
  deletePost: (postId: string) => Promise<void>
  reset: () => void
}

export const useAsyncStore = create<AsyncStore>()((set, get) => ({
  // Initial state
  user: null,
  posts: [],
  isLoadingUser: false,
  isLoadingPosts: false,
  isSavingPost: false,
  userError: null,
  postsError: null,
  saveError: null,

  // Fetch user
  fetchUser: async (userId) => {
    set({ isLoadingUser: true, userError: null })

    try {
      const response = await apiClient.get<User>(`/users/${userId}`)
      set({ user: response.data, isLoadingUser: false })
    } catch (error) {
      set({
        userError: getErrorMessage(error, 'Failed to fetch user.'),
        isLoadingUser: false,
        user: null,
      })
    }
  },

  // Fetch posts
  fetchPosts: async (userId) => {
    set({ isLoadingPosts: true, postsError: null })

    try {
      const response = await apiClient.get<Post[]>(`/users/${userId}/posts`)
      set({ posts: response.data, isLoadingPosts: false })
    } catch (error) {
      set({
        postsError: getErrorMessage(error, 'Failed to fetch posts.'),
        isLoadingPosts: false,
      })
    }
  },

  // Create post with optimistic update
  createPost: async (post) => {
    const tempId = `temp-${Date.now()}`
    const optimisticPost = { ...post, id: tempId }

    // Optimistic update
    set((state) => ({
      posts: [...state.posts, optimisticPost],
      isSavingPost: true,
      saveError: null,
    }))

    try {
      const response = await apiClient.post<Post>('/posts', post)
      const savedPost = response.data

      // Replace optimistic post with real one
      set((state) => ({
        posts: state.posts.map((p) =>
          p.id === tempId ? savedPost : p
        ),
        isSavingPost: false,
      }))
    } catch (error) {
      // Rollback optimistic update
      set((state) => ({
        posts: state.posts.filter((p) => p.id !== tempId),
        saveError: getErrorMessage(error, 'Failed to create post.'),
        isSavingPost: false,
      }))
    }
  },

  // Delete post
  deletePost: async (postId) => {
    // Store original posts for rollback
    const originalPosts = get().posts

    // Optimistic update
    set((state) => ({
      posts: state.posts.filter((p) => p.id !== postId),
      saveError: null,
    }))

    try {
      await apiClient.delete(`/posts/${postId}`)
    } catch (error) {
      // Rollback on error
      set({
        posts: originalPosts,
        saveError: getErrorMessage(error, 'Failed to delete post.'),
      })
    }
  },

  // Reset
  reset: () =>
    set({
      user: null,
      posts: [],
      isLoadingUser: false,
      isLoadingPosts: false,
      isSavingPost: false,
      userError: null,
      postsError: null,
      saveError: null,
    }),
}))

/**
 * Usage in components:
 *
 * function UserProfile({ userId }: { userId: string }) {
 *   const user = useAsyncStore((state) => state.user)
 *   const isLoading = useAsyncStore((state) => state.isLoadingUser)
 *   const error = useAsyncStore((state) => state.userError)
 *   const fetchUser = useAsyncStore((state) => state.fetchUser)
 *
 *   useEffect(() => {
 *     fetchUser(userId)
 *   }, [userId, fetchUser])
 *
 *   if (isLoading) return <div>Loading...</div>
 *   if (error) return <div>Error: {error}</div>
 *   if (!user) return <div>No user found</div>
 *
 *   return (
 *     <div>
 *       <h1>{user.name}</h1>
 *       <p>{user.email}</p>
 *     </div>
 *   )
 * }
 *
 * function PostsList({ userId }: { userId: string }) {
 *   const posts = useAsyncStore((state) => state.posts)
 *   const isLoading = useAsyncStore((state) => state.isLoadingPosts)
 *   const error = useAsyncStore((state) => state.postsError)
 *   const fetchPosts = useAsyncStore((state) => state.fetchPosts)
 *   const deletePost = useAsyncStore((state) => state.deletePost)
 *
 *   useEffect(() => {
 *     fetchPosts(userId)
 *   }, [userId, fetchPosts])
 *
 *   if (isLoading) return <div>Loading posts...</div>
 *   if (error) return <div>Error: {error}</div>
 *
 *   return (
 *     <ul>
 *       {posts.map((post) => (
 *         <li key={post.id}>
 *           <h3>{post.title}</h3>
 *           <p>{post.body}</p>
 *           <button onClick={() => deletePost(post.id)}>Delete</button>
 *         </li>
 *       ))}
 *     </ul>
 *   )
 * }
 *
 * function CreatePostForm({ userId }: { userId: string }) {
 *   const [title, setTitle] = useState('')
 *   const [body, setBody] = useState('')
 *   const createPost = useAsyncStore((state) => state.createPost)
 *   const isSaving = useAsyncStore((state) => state.isSavingPost)
 *   const error = useAsyncStore((state) => state.saveError)
 *
 *   const handleSubmit = async (e: FormEvent) => {
 *     e.preventDefault()
 *     await createPost({ title, body, userId })
 *     setTitle('')
 *     setBody('')
 *   }
 *
 *   return (
 *     <form onSubmit={handleSubmit}>
 *       <input
 *         value={title}
 *         onChange={(e) => setTitle(e.target.value)}
 *         placeholder="Title"
 *       />
 *       <textarea
 *         value={body}
 *         onChange={(e) => setBody(e.target.value)}
 *         placeholder="Body"
 *       />
 *       <button type="submit" disabled={isSaving}>
 *         {isSaving ? 'Creating...' : 'Create Post'}
 *       </button>
 *       {error && <div>Error: {error}</div>}
 *     </form>
 *   )
 * }
 *
 * ADVANCED: Request Cancellation with AbortController
 *
 * let abortController: AbortController | null = null
 *
 * fetchUserWithCancellation: async (userId) => {
 *   // Cancel previous request
 *   abortController?.abort()
 *   abortController = new AbortController()
 *
 *   set({ isLoadingUser: true, userError: null })
 *
 *   try {
 *     const response = await apiClient.get<User>(
 *       `/users/${userId}`,
 *       { signal: abortController.signal }
 *     )
 *     set({ user: response.data, isLoadingUser: false })
 *   } catch (error) {
 *     if (axios.isAxiosError(error) && error.code === 'ERR_CANCELED') {
 *       // Request was cancelled
 *       return
 *     }
 *     // ... handle other errors
 *   }
 * }
 */
