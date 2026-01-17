import React, { useState, useEffect } from 'react';
import axios from 'axios';

const Profile = () => {
    const [user, setUser] = useState({ name: '', email: '', phone: '', role: '', licenseId: '' });
    const [newPassword, setNewPassword] = useState('');
    const [editing, setEditing] = useState(false);

    useEffect(() => {
        const token = localStorage.getItem('token');

        if (token) {
            axios.get('http://localhost:5000/api/users/me', {
                headers: { Authorization: `Bearer ${token}` }
            })
                .then(res => {
                    setUser({
                        name: res.data.name || '',
                        email: res.data.email || '',
                        phone: res.data.phone || '',
                        role: res.data.role || '',
                        licenseId: res.data.licenseId || '', // Fetch licenseId for drivers
                    });
                })
                .catch(err => {
                    console.error('Failed to load profile', err);
                    alert('Failed to load profile.');
                });
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setUser((prev) => ({ ...prev, [name]: value }));
    };

    const handleSave = async () => {
        const token = localStorage.getItem('token');

        const payload = {
            name: user.name,
            phone: user.phone,
        };

        if (newPassword) payload.password = newPassword;
        if (user.role === 'driver' && user.licenseId) payload.licenseId = user.licenseId;

        console.log('Sending update:', payload);

        try {
            const res = await axios.put('http://localhost:5000/api/users/me', payload, {
                headers: { Authorization: `Bearer ${token}` }
            });

            localStorage.setItem('user', JSON.stringify(res.data.user));
            setNewPassword('');
            setEditing(false);
            alert('Profile updated successfully.');
        } catch (err) {
            console.error('Frontend update error:', err?.response?.data || err.message);
            alert('Failed to update profile: ' + (err.response?.data?.message || err.message));
        }
    };

    return (
        <div className="min-h-screen bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center px-4 py-10">
            <div className="bg-white dark:bg-neutral-800 shadow-lg rounded-lg p-6 w-full max-w-md">
                <h2 className="text-2xl font-semibold mb-4 text-center">Profile</h2>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm text-neutral-700 dark:text-neutral-200 mb-1">Name</label>
                        <input
                            type="text"
                            name="name"
                            value={user.name}
                            onChange={handleChange}
                            disabled={!editing}
                            className="w-full px-3 py-2 border rounded bg-neutral-50 dark:bg-neutral-700 dark:text-white"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-neutral-700 dark:text-neutral-200 mb-1">Email</label>
                        <input
                            type="email"
                            name="email"
                            value={user.email}
                            disabled
                            className="w-full px-3 py-2 border rounded bg-neutral-200 dark:bg-neutral-700 dark:text-white cursor-not-allowed"
                        />
                    </div>

                    <div>
                        <label className="block text-sm text-neutral-700 dark:text-neutral-200 mb-1">Phone</label>
                        <input
                            type="text"
                            name="phone"
                            value={user.phone}
                            onChange={handleChange}
                            disabled={!editing}
                            className="w-full px-3 py-2 border rounded bg-neutral-50 dark:bg-neutral-700 dark:text-white"
                        />
                    </div>

                    {user.role === 'driver' && (
                        <div>
                            <label className="block text-sm text-neutral-700 dark:text-neutral-200 mb-1">License ID</label>
                            <input
                                type="text"
                                name="licenseId"
                                value={user.licenseId}
                                onChange={handleChange}
                                disabled={!editing}
                                className="w-full px-3 py-2 border rounded bg-neutral-50 dark:bg-neutral-700 dark:text-white"
                                placeholder="Enter your license ID"
                            />
                        </div>
                    )}

                    {editing && (
                        <div>
                            <label className="block text-sm text-neutral-700 dark:text-neutral-200 mb-1">New Password</label>
                            <input
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full px-3 py-2 border rounded bg-neutral-50 dark:bg-neutral-700 dark:text-white"
                            />
                        </div>
                    )}

                    <div className="flex justify-end gap-2 mt-4">
                        {!editing ? (
                            <button
                                onClick={() => setEditing(true)}
                                className="bg-violet-600 text-white px-4 py-2 rounded hover:bg-violet-700"
                            >
                                Edit
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={handleSave}
                                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                                >
                                    Save
                                </button>
                                <button
                                    onClick={() => {
                                        setEditing(false);
                                        setNewPassword('');
                                    }}
                                    className="bg-gray-300 text-black px-4 py-2 rounded hover:bg-gray-400"
                                >
                                    Cancel
                                </button>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;