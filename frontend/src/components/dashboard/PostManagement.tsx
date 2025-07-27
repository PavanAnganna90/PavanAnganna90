'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  FileText,
  Calendar,
  User as UserIcon,
  Tag,
  Folder,
  Image,
  BarChart3,
  Clock,
} from 'lucide-react';
import { Post, PostStatus, CreatePostRequest, UpdatePostRequest, PostQueryParams } from '@/types/api';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';
import { useAuth, useRoleAccess } from '@/contexts/DashboardAuthContext';
import { createPostSchema, updatePostSchema, CreatePostFormData, UpdatePostFormData } from '@/lib/validations';
import { DataTable, Column, RowActions } from '@/components/ui/data-table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select-shadcn';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface PostManagementProps {
  className?: string;
}

export function PostManagement({ className }: PostManagementProps) {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });
  const [filters, setFilters] = useState<PostQueryParams>({});
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  const { addToast } = useToast();
  const { user } = useAuth();
  const { isAdmin, canAccess } = useRoleAccess();

  // Load posts
  const loadPosts = async (newFilters?: PostQueryParams) => {
    try {
      setLoading(true);
      const params = { ...filters, ...newFilters };
      const response = await api.posts.getAll(params);
      setPosts(response.data.data);
      setPagination(response.data.pagination);
    } catch (error: any) {
      addToast({
        title: 'Error',
        message: error.message || 'Failed to load posts',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  // Get status badge variant
  const getStatusBadgeVariant = (status: PostStatus) => {
    switch (status) {
      case PostStatus.PUBLISHED:
        return 'success';
      case PostStatus.DRAFT:
        return 'secondary';
      case PostStatus.ARCHIVED:
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  // Table columns
  const columns: Column<Post>[] = [
    {
      key: 'featuredImage',
      label: '',
      width: '60px',
      render: (featuredImage) => (
        <div className="flex items-center justify-center">
          {featuredImage ? (
            <img
              src={featuredImage}
              alt="Featured"
              className="w-10 h-10 rounded object-cover"
            />
          ) : (
            <div className="w-10 h-10 rounded bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <Image className="w-4 h-4 text-gray-400" />
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'title',
      label: 'Title',
      sortable: true,
      searchable: true,
      render: (title, post) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white line-clamp-1">
            {title}
          </div>
          {post.excerpt && (
            <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1 mt-1">
              {post.excerpt}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'author',
      label: 'Author',
      sortable: true,
      render: (_, post) => (
        <div className="flex items-center">
          <UserIcon className="w-4 h-4 mr-2 text-gray-400" />
          <span className="text-gray-900 dark:text-white">
            {post.author.firstName} {post.author.lastName}
          </span>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filterable: true,
      render: (status) => (
        <Badge variant={getStatusBadgeVariant(status)}>
          <FileText className="w-3 h-3 mr-1" />
          {status}
        </Badge>
      ),
    },
    {
      key: 'tags',
      label: 'Tags',
      render: (tags) => (
        <div className="flex flex-wrap gap-1">
          {tags.slice(0, 2).map((tag: string, index: number) => (
            <Badge key={index} variant="outline" className="text-xs">
              <Tag className="w-2 h-2 mr-1" />
              {tag}
            </Badge>
          ))}
          {tags.length > 2 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 2}
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'viewCount',
      label: 'Views',
      sortable: true,
      align: 'center',
      render: (viewCount) => (
        <div className="flex items-center justify-center">
          <BarChart3 className="w-4 h-4 mr-1 text-gray-400" />
          <span className="text-gray-900 dark:text-white">{viewCount}</span>
        </div>
      ),
    },
    {
      key: 'publishedAt',
      label: 'Published',
      sortable: true,
      render: (publishedAt) => (
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Calendar className="w-4 h-4 mr-2" />
          {publishedAt ? new Date(publishedAt).toLocaleDateString() : 'Not published'}
        </div>
      ),
    },
    {
      key: 'updatedAt',
      label: 'Updated',
      sortable: true,
      render: (updatedAt) => (
        <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
          <Clock className="w-4 h-4 mr-2" />
          {new Date(updatedAt).toLocaleDateString()}
        </div>
      ),
    },
  ];

  // Handle table actions
  const handleSort = (key: keyof Post, direction: 'asc' | 'desc') => {
    const newFilters = { ...filters, sortBy: key as any, sortOrder: direction };
    setFilters(newFilters);
    loadPosts(newFilters);
  };

  const handleSearch = (query: string) => {
    const newFilters = { ...filters, search: query, page: 1 };
    setFilters(newFilters);
    loadPosts(newFilters);
  };

  const handlePageChange = (page: number) => {
    const newFilters = { ...filters, page };
    setFilters(newFilters);
    loadPosts(newFilters);
  };

  const handlePageSizeChange = (limit: number) => {
    const newFilters = { ...filters, limit, page: 1 };
    setFilters(newFilters);
    loadPosts(newFilters);
  };

  // Post actions
  const handleCreatePost = async (data: CreatePostFormData) => {
    try {
      await api.posts.create(data);
      addToast({
        title: 'Success',
        message: 'Post created successfully',
        type: 'success',
      });
      setIsCreateModalOpen(false);
      loadPosts();
    } catch (error: any) {
      addToast({
        title: 'Error',
        message: error.message || 'Failed to create post',
        type: 'error',
      });
    }
  };

  const handleUpdatePost = async (data: UpdatePostFormData) => {
    if (!selectedPost) return;

    try {
      await api.posts.update(selectedPost.id, data);
      addToast({
        title: 'Success',
        message: 'Post updated successfully',
        type: 'success',
      });
      setIsEditModalOpen(false);
      setSelectedPost(null);
      loadPosts();
    } catch (error: any) {
      addToast({
        title: 'Error',
        message: error.message || 'Failed to update post',
        type: 'error',
      });
    }
  };

  const handleDeletePost = async (post: Post) => {
    if (!confirm(`Are you sure you want to delete "${post.title}"?`)) {
      return;
    }

    try {
      await api.posts.delete(post.id);
      addToast({
        title: 'Success',
        message: 'Post deleted successfully',
        type: 'success',
      });
      loadPosts();
    } catch (error: any) {
      addToast({
        title: 'Error',
        message: error.message || 'Failed to delete post',
        type: 'error',
      });
    }
  };

  // Check if user can edit/delete post
  const canEditPost = (post: Post) => {
    return isAdmin || (user && post.authorId === user.id);
  };

  // Row actions
  const getRowActions = (post: Post) => (
    <RowActions
      onView={() => {
        setSelectedPost(post);
        setIsViewModalOpen(true);
      }}
      onEdit={() => {
        setSelectedPost(post);
        setIsEditModalOpen(true);
      }}
      onDelete={() => handleDeletePost(post)}
      canEdit={canEditPost(post)}
      canDelete={canEditPost(post)}
    />
  );

  if (!canAccess()) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            You don't have permission to access post management.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl font-bold">Post Management</CardTitle>
              <CardDescription>
                Create, edit, and manage blog posts and content
              </CardDescription>
            </div>
            <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  New Post
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                <CreatePostModal onSubmit={handleCreatePost} />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <DataTable
            data={posts}
            columns={columns}
            loading={loading}
            totalCount={pagination.total}
            pageSize={pagination.limit}
            currentPage={pagination.page}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onSort={handleSort}
            onSearch={handleSearch}
            searchPlaceholder="Search posts by title, content, or author..."
            emptyMessage="No posts found"
            rowActions={getRowActions}
          />
        </CardContent>
      </Card>

      {/* Edit Post Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedPost && (
            <EditPostModal
              post={selectedPost}
              onSubmit={handleUpdatePost}
              onClose={() => {
                setIsEditModalOpen(false);
                setSelectedPost(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Post Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedPost && (
            <ViewPostModal
              post={selectedPost}
              onClose={() => {
                setIsViewModalOpen(false);
                setSelectedPost(null);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Create Post Modal
function CreatePostModal({ onSubmit }: { onSubmit: (data: CreatePostFormData) => void }) {
  const form = useForm<CreatePostFormData>({
    resolver: zodResolver(createPostSchema),
    defaultValues: {
      title: '',
      content: '',
      excerpt: '',
      status: PostStatus.DRAFT,
      featuredImage: '',
      tags: [],
      categories: [],
      publishedAt: '',
    },
  });

  const [tagInput, setTagInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');

  const addTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues('tags') || [];
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const addCategory = () => {
    if (categoryInput.trim()) {
      const currentCategories = form.getValues('categories') || [];
      if (!currentCategories.includes(categoryInput.trim())) {
        form.setValue('categories', [...currentCategories, categoryInput.trim()]);
      }
      setCategoryInput('');
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    const currentCategories = form.getValues('categories') || [];
    form.setValue('categories', currentCategories.filter(cat => cat !== categoryToRemove));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Create New Post</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title *</Label>
          <Input
            id="title"
            {...form.register('title')}
            className={form.formState.errors.title ? 'border-red-500' : ''}
            placeholder="Enter post title"
          />
          {form.formState.errors.title && (
            <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            {...form.register('excerpt')}
            className={form.formState.errors.excerpt ? 'border-red-500' : ''}
            placeholder="Brief description of the post"
            rows={3}
          />
          {form.formState.errors.excerpt && (
            <p className="text-sm text-red-600">{form.formState.errors.excerpt.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content *</Label>
          <Textarea
            id="content"
            {...form.register('content')}
            className={form.formState.errors.content ? 'border-red-500' : ''}
            placeholder="Write your post content here..."
            rows={10}
          />
          {form.formState.errors.content && (
            <p className="text-sm text-red-600">{form.formState.errors.content.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(value) => form.setValue('status', value as PostStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PostStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={PostStatus.PUBLISHED}>Published</SelectItem>
                <SelectItem value={PostStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="featuredImage">Featured Image URL</Label>
            <Input
              id="featuredImage"
              {...form.register('featuredImage')}
              className={form.formState.errors.featuredImage ? 'border-red-500' : ''}
              placeholder="https://example.com/image.jpg"
            />
            {form.formState.errors.featuredImage && (
              <p className="text-sm text-red-600">{form.formState.errors.featuredImage.message}</p>
            )}
          </div>
        </div>

        {form.watch('status') === PostStatus.PUBLISHED && (
          <div className="space-y-2">
            <Label htmlFor="publishedAt">Publish Date & Time</Label>
            <Input
              id="publishedAt"
              type="datetime-local"
              {...form.register('publishedAt')}
              className={form.formState.errors.publishedAt ? 'border-red-500' : ''}
            />
            {form.formState.errors.publishedAt && (
              <p className="text-sm text-red-600">{form.formState.errors.publishedAt.message}</p>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex space-x-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" onClick={addTag} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(form.watch('tags') || []).map((tag, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} ×
              </Badge>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="flex space-x-2">
            <Input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              placeholder="Add a category"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
            />
            <Button type="button" onClick={addCategory} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(form.watch('categories') || []).map((category, index) => (
              <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => removeCategory(category)}>
                {category} ×
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="submit">Create Post</Button>
        </div>
      </form>
    </>
  );
}

// Edit Post Modal
function EditPostModal({
  post,
  onSubmit,
  onClose,
}: {
  post: Post;
  onSubmit: (data: UpdatePostFormData) => void;
  onClose: () => void;
}) {
  const form = useForm<UpdatePostFormData>({
    resolver: zodResolver(updatePostSchema),
    defaultValues: {
      title: post.title,
      content: post.content,
      excerpt: post.excerpt || '',
      status: post.status,
      featuredImage: post.featuredImage || '',
      tags: post.tags,
      categories: post.categories,
      publishedAt: post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 16) : '',
    },
  });

  const [tagInput, setTagInput] = useState('');
  const [categoryInput, setCategoryInput] = useState('');

  const addTag = () => {
    if (tagInput.trim()) {
      const currentTags = form.getValues('tags') || [];
      if (!currentTags.includes(tagInput.trim())) {
        form.setValue('tags', [...currentTags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    const currentTags = form.getValues('tags') || [];
    form.setValue('tags', currentTags.filter(tag => tag !== tagToRemove));
  };

  const addCategory = () => {
    if (categoryInput.trim()) {
      const currentCategories = form.getValues('categories') || [];
      if (!currentCategories.includes(categoryInput.trim())) {
        form.setValue('categories', [...currentCategories, categoryInput.trim()]);
      }
      setCategoryInput('');
    }
  };

  const removeCategory = (categoryToRemove: string) => {
    const currentCategories = form.getValues('categories') || [];
    form.setValue('categories', currentCategories.filter(cat => cat !== categoryToRemove));
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Edit Post</DialogTitle>
      </DialogHeader>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="space-y-2">
          <Label htmlFor="title">Title</Label>
          <Input
            id="title"
            {...form.register('title')}
            className={form.formState.errors.title ? 'border-red-500' : ''}
          />
          {form.formState.errors.title && (
            <p className="text-sm text-red-600">{form.formState.errors.title.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="excerpt">Excerpt</Label>
          <Textarea
            id="excerpt"
            {...form.register('excerpt')}
            className={form.formState.errors.excerpt ? 'border-red-500' : ''}
            rows={3}
          />
          {form.formState.errors.excerpt && (
            <p className="text-sm text-red-600">{form.formState.errors.excerpt.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="content">Content</Label>
          <Textarea
            id="content"
            {...form.register('content')}
            className={form.formState.errors.content ? 'border-red-500' : ''}
            rows={10}
          />
          {form.formState.errors.content && (
            <p className="text-sm text-red-600">{form.formState.errors.content.message}</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select
              value={form.watch('status')}
              onValueChange={(value) => form.setValue('status', value as PostStatus)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PostStatus.DRAFT}>Draft</SelectItem>
                <SelectItem value={PostStatus.PUBLISHED}>Published</SelectItem>
                <SelectItem value={PostStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="featuredImage">Featured Image URL</Label>
            <Input
              id="featuredImage"
              {...form.register('featuredImage')}
              className={form.formState.errors.featuredImage ? 'border-red-500' : ''}
            />
            {form.formState.errors.featuredImage && (
              <p className="text-sm text-red-600">{form.formState.errors.featuredImage.message}</p>
            )}
          </div>
        </div>

        {form.watch('status') === PostStatus.PUBLISHED && (
          <div className="space-y-2">
            <Label htmlFor="publishedAt">Publish Date & Time</Label>
            <Input
              id="publishedAt"
              type="datetime-local"
              {...form.register('publishedAt')}
              className={form.formState.errors.publishedAt ? 'border-red-500' : ''}
            />
            {form.formState.errors.publishedAt && (
              <p className="text-sm text-red-600">{form.formState.errors.publishedAt.message}</p>
            )}
          </div>
        )}

        {/* Tags */}
        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex space-x-2">
            <Input
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              placeholder="Add a tag"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
            />
            <Button type="button" onClick={addTag} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(form.watch('tags') || []).map((tag, index) => (
              <Badge key={index} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} ×
              </Badge>
            ))}
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2">
          <Label>Categories</Label>
          <div className="flex space-x-2">
            <Input
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              placeholder="Add a category"
              onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCategory())}
            />
            <Button type="button" onClick={addCategory} variant="outline">
              Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(form.watch('categories') || []).map((category, index) => (
              <Badge key={index} variant="outline" className="cursor-pointer" onClick={() => removeCategory(category)}>
                {category} ×
              </Badge>
            ))}
          </div>
        </div>

        <div className="flex justify-end space-x-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Update Post</Button>
        </div>
      </form>
    </>
  );
}

// View Post Modal
function ViewPostModal({ post, onClose }: { post: Post; onClose: () => void }) {
  return (
    <>
      <DialogHeader>
        <DialogTitle>Post Details</DialogTitle>
      </DialogHeader>
      <div className="space-y-6">
        {post.featuredImage && (
          <div>
            <img
              src={post.featuredImage}
              alt={post.title}
              className="w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}

        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {post.title}
          </h1>
          {post.excerpt && (
            <p className="text-lg text-gray-600 dark:text-gray-400 mb-4">
              {post.excerpt}
            </p>
          )}
        </div>

        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="flex items-center">
            <UserIcon className="w-4 h-4 mr-1" />
            {post.author.firstName} {post.author.lastName}
          </div>
          <div className="flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString() : 'Not published'}
          </div>
          <div className="flex items-center">
            <BarChart3 className="w-4 h-4 mr-1" />
            {post.viewCount} views
          </div>
          <Badge variant={getStatusBadgeVariant(post.status)}>
            {post.status}
          </Badge>
        </div>

        {(post.tags.length > 0 || post.categories.length > 0) && (
          <div className="space-y-2">
            {post.tags.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Tags</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {post.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary">
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
            {post.categories.length > 0 && (
              <div>
                <Label className="text-sm font-medium text-gray-500">Categories</Label>
                <div className="flex flex-wrap gap-2 mt-1">
                  {post.categories.map((category, index) => (
                    <Badge key={index} variant="outline">
                      <Folder className="w-3 h-3 mr-1" />
                      {category}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <div>
          <Label className="text-sm font-medium text-gray-500">Content</Label>
          <div className="mt-2 prose dark:prose-invert max-w-none">
            <div className="whitespace-pre-wrap">{post.content}</div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </>
  );
}

// Helper function to get status badge variant
function getStatusBadgeVariant(status: PostStatus) {
  switch (status) {
    case PostStatus.PUBLISHED:
      return 'success' as const;
    case PostStatus.DRAFT:
      return 'secondary' as const;
    case PostStatus.ARCHIVED:
      return 'destructive' as const;
    default:
      return 'secondary' as const;
  }
}