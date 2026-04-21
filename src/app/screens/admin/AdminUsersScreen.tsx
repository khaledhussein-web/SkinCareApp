import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Label } from '@/app/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/app/components/ui/select';
import { Search, Edit, Trash2, Ban, UserCheck, MoreVertical } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'banned' | 'pending';
  joinedAt: string;
  lastLogin: string;
  assessments: number;
}

export const AdminUsersScreen: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  // Mock users data
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      name: 'Emily Johnson',
      email: 'emily.j@example.com',
      role: 'user',
      status: 'active',
      joinedAt: '2026-01-15',
      lastLogin: '2 hours ago',
      assessments: 12,
    },
    {
      id: '2',
      name: 'Michael Chen',
      email: 'm.chen@example.com',
      role: 'user',
      status: 'active',
      joinedAt: '2026-01-20',
      lastLogin: '1 day ago',
      assessments: 8,
    },
    {
      id: '3',
      name: 'Sarah Williams',
      email: 'sarah.w@example.com',
      role: 'user',
      status: 'pending',
      joinedAt: '2026-02-05',
      lastLogin: '3 days ago',
      assessments: 2,
    },
    {
      id: '4',
      name: 'David Martinez',
      email: 'd.martinez@example.com',
      role: 'admin',
      status: 'active',
      joinedAt: '2025-12-01',
      lastLogin: '5 hours ago',
      assessments: 25,
    },
    {
      id: '5',
      name: 'Lisa Anderson',
      email: 'lisa.a@example.com',
      role: 'user',
      status: 'banned',
      joinedAt: '2026-01-10',
      lastLogin: '1 week ago',
      assessments: 5,
    },
  ]);

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filterStatus === 'all' || user.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'banned':
        return 'bg-red-100 text-red-700 border-red-200';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getRoleColor = (role: string) => {
    return role === 'admin'
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : 'bg-blue-100 text-blue-700 border-blue-200';
  };

  const handleBanUser = (user: User) => {
    const newStatus = user.status === 'banned' ? 'active' : 'banned';
    setUsers(users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)));
    toast.success(`User ${newStatus === 'banned' ? 'banned' : 'unbanned'} successfully`);
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      setUsers(users.filter((u) => u.id !== selectedUser.id));
      toast.success('User deleted successfully');
      setIsDeleteDialogOpen(false);
      setSelectedUser(null);
    }
  };

  const handleUpdateUser = () => {
    if (selectedUser) {
      setUsers(users.map((u) => (u.id === selectedUser.id ? selectedUser : u)));
      toast.success('User updated successfully');
      setIsEditDialogOpen(false);
      setSelectedUser(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h2 className="text-2xl text-slate-800">User Management</h2>
          <p className="text-sm text-slate-600">Manage and monitor user accounts</p>
        </div>
        <div className="text-sm text-slate-600">
          Total Users: <strong>{users.length}</strong>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input
            placeholder="Search users by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="banned">Banned</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Users Table */}
      <Card className="border-none shadow-md bg-white/90 backdrop-blur">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr>
                  <th className="text-left p-4 text-sm text-slate-600">User</th>
                  <th className="text-left p-4 text-sm text-slate-600">Role</th>
                  <th className="text-left p-4 text-sm text-slate-600">Status</th>
                  <th className="text-left p-4 text-sm text-slate-600">Joined</th>
                  <th className="text-left p-4 text-sm text-slate-600">Last Login</th>
                  <th className="text-left p-4 text-sm text-slate-600">Assessments</th>
                  <th className="text-right p-4 text-sm text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user, index) => (
                  <motion.tr
                    key={user.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="border-b hover:bg-slate-50"
                  >
                    <td className="p-4">
                      <div>
                        <p className="text-sm text-slate-800">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={getRoleColor(user.role)}>
                        {user.role}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <Badge variant="outline" className={getStatusColor(user.status)}>
                        {user.status}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600">{user.joinedAt}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600">{user.lastLogin}</p>
                    </td>
                    <td className="p-4">
                      <p className="text-sm text-slate-600">{user.assessments}</p>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsEditDialogOpen(true);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleBanUser(user)}
                        >
                          {user.status === 'banned' ? (
                            <UserCheck className="w-4 h-4 text-green-600" />
                          ) : (
                            <Ban className="w-4 h-4 text-orange-600" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedUser(user);
                            setIsDeleteDialogOpen(true);
                          }}
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Edit User Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and permissions</DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="space-y-4">
              <div>
                <Label>Name</Label>
                <Input
                  value={selectedUser.name}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Email</Label>
                <Input
                  type="email"
                  value={selectedUser.email}
                  onChange={(e) =>
                    setSelectedUser({ ...selectedUser, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Role</Label>
                <Select
                  value={selectedUser.role}
                  onValueChange={(value: 'user' | 'admin') =>
                    setSelectedUser({ ...selectedUser, role: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="user">User</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select
                  value={selectedUser.status}
                  onValueChange={(value: 'active' | 'banned' | 'pending') =>
                    setSelectedUser({ ...selectedUser, status: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleUpdateUser}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete User Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete User</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this user? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedUser && (
            <div className="p-4 bg-red-50 rounded-lg">
              <p className="text-sm text-slate-800">
                <strong>{selectedUser.name}</strong>
              </p>
              <p className="text-xs text-slate-600">{selectedUser.email}</p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteUser}>
              Delete User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
