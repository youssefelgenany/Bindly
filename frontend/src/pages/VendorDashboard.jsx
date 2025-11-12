import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { vendorApi } from '../api/vendorApi';

const VendorDashboard = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [upcomingEvents, setUpcomingEvents] = useState([]);
    const [applications, setApplications] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            setLoading(true);
            // Fetch upcoming events (accepted applications)
            const acceptedRes = await vendorApi.listMyAccepted();
            const events = Array.isArray(acceptedRes?.events) ? acceptedRes.events : [];
            setUpcomingEvents(events.slice(0, 3)); // Show first 3

            // Fetch recent applications
            const [pendingRes, rejectedRes, acceptedAppsRes] = await Promise.all([
                vendorApi.listMyRequests({ status: 'pending' }),
                vendorApi.listMyRequests({ status: 'rejected' }),
                vendorApi.listMyRequests({ status: 'accepted' })
            ]);

            const pending = Array.isArray(pendingRes?.events) ? pendingRes.events : [];
            const rejected = Array.isArray(rejectedRes?.events) ? rejectedRes.events : [];
            const accepted = Array.isArray(acceptedAppsRes?.events) ? acceptedAppsRes.events : [];

            // Combine and sort by date (most recent first)
            const allApplications = [
                ...pending.map(app => ({ ...app, status: 'pending' })),
                ...rejected.map(app => ({ ...app, status: 'rejected' })),
                ...accepted.map(app => ({ ...app, status: 'approved' }))
            ].sort((a, b) => {
                const dateA = new Date(a.createdAt || a.dateApplied || 0);
                const dateB = new Date(b.createdAt || b.dateApplied || 0);
                return dateB - dateA;
            }).slice(0, 3); // Show first 3

            setApplications(allApplications);

            // Generate notifications from applications
            const notifs = [];
            accepted.forEach(app => {
                notifs.push({
                    type: 'success',
                    message: `Your application for ${app.eventName || app.name || 'an event'} has been approved!`,
                    time: '2 hours ago',
                    icon: 'check_circle'
                });
            });
            if (pending.length > 0) {
                notifs.push({
                    type: 'info',
                    message: `New Event: "${pending[0].eventName || pending[0].name || 'Event'}" is now accepting applications.`,
                    time: '1 day ago',
                    icon: 'campaign'
                });
            }
            if (events.length > 0) {
                notifs.push({
                    type: 'warning',
                    message: `Payment for the ${events[0].name || events[0].title || 'upcoming event'} booth is due in 3 days.`,
                    time: '2 days ago',
                    icon: 'error'
                });
            }
            setNotifications(notifs.slice(0, 3));
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = (e) => {
        e.preventDefault();
        e.stopPropagation();
        logout();
        navigate('/login');
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('en-US', { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return dateString;
        }
    };

    const getStatusBadge = (status) => {
        const statusMap = {
            approved: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300', label: 'Approved' },
            pending: { bg: 'bg-orange-100 dark:bg-orange-900/50', text: 'text-orange-800 dark:text-orange-300', label: 'Pending' },
            rejected: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300', label: 'Denied' }
        };
        const config = statusMap[status] || statusMap.pending;
        return (
            <span className={`inline-flex items-center rounded-full ${config.bg} px-3 py-1 text-xs font-semibold ${config.text}`}>
                {config.label}
            </span>
        );
    };

    const getNotificationIcon = (icon) => {
        const iconMap = {
            check_circle: { bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-600 dark:text-green-300' },
            campaign: { bg: 'bg-primary/10 dark:bg-primary/30', text: 'text-primary dark:text-yellow-400' },
            error: { bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-600 dark:text-red-300' }
        };
        const config = iconMap[icon] || iconMap.campaign;
        return config;
    };

    const companyName = user?.companyName || 'Campus Eats Co.';
    const displayName = user?.companyName || `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Vendor';

    return (
        <div className="relative flex min-h-screen w-full">
            {/* SideNavBar */}
            <aside 
                className={`flex h-screen flex-col bg-primary dark:bg-primary/95 text-white sticky top-0 transition-all duration-300 ${
                    sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
                }`}
            >
                <div className={`flex flex-col gap-4 p-4 ${!sidebarOpen ? 'hidden' : ''}`}>
                    <div className="flex items-center gap-3 px-2 py-4">
                        <div 
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" 
                            style={{
                                backgroundImage: user?.profilePicture 
                                    ? `url(${user.profilePicture})` 
                                    : `url("https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=012d90&color=fff")`
                            }}
                        ></div>
                        <div className="flex flex-col">
                            <h1 className="text-base font-bold leading-normal">{companyName}</h1>
                            <p className="text-sm font-normal leading-normal text-gray-300">Vendor Portal</p>
                        </div>
                    </div>
                    <nav className="flex flex-col gap-2">
                        <Link 
                            to="/vendor" 
                            className="flex items-center gap-3 rounded-lg bg-white/10 px-3 py-2.5"
                        >
                            <span className="material-symbols-outlined text-white" style={{ fontSize: 24 }}>dashboard</span>
                            <p className="text-sm font-semibold leading-normal text-white">Dashboard</p>
                        </Link>
                        <Link 
                            to="/vendor/bazaars" 
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 24 }}>search</span>
                            <p className="text-sm font-medium leading-normal text-gray-300">Find Events</p>
                        </Link>
                        <Link 
                            to="/vendor/requests" 
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 24 }}>assignment</span>
                            <p className="text-sm font-medium leading-normal text-gray-300">My Applications</p>
                        </Link>
                        <Link 
                            to="/dashboard" 
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/10 transition-colors"
                        >
                            <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 24 }}>account_circle</span>
                            <p className="text-sm font-medium leading-normal text-gray-300">Profile</p>
                        </Link>
                        <button 
                            onClick={() => {/* Handle notifications */}}
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/10 transition-colors text-left w-full"
                        >
                            <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 24 }}>notifications</span>
                            <p className="text-sm font-medium leading-normal text-gray-300">Notifications</p>
                        </button>
                    </nav>
                </div>
                <div className="mt-auto p-4">
                    <button 
                        type="button"
                        onClick={handleLogout}
                        className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-white/10 transition-colors text-left w-full"
                    >
                        <span className="material-symbols-outlined text-gray-300" style={{ fontSize: 24 }}>logout</span>
                        <p className="text-sm font-medium leading-normal text-gray-300">Logout</p>
                    </button>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1">
                {/* TopNavBar */}
                <header className="flex items-center justify-between whitespace-nowrap border-b border-solid border-gray-200 dark:border-gray-700 bg-background-light dark:bg-background-dark px-6 py-2 sticky top-0 z-10">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="flex items-center justify-center p-2 rounded-lg hover:bg-gray-200/60 dark:hover:bg-gray-700 transition-colors"
                            aria-label="Toggle sidebar"
                        >
                            <span className="material-symbols-outlined text-gray-700 dark:text-gray-300" style={{ fontSize: 24 }}>
                                menu
                            </span>
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <button className="flex max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-10 bg-gray-200/60 dark:bg-gray-800 text-gray-700 dark:text-gray-300 gap-2 text-sm font-bold leading-normal tracking-[0.015em] min-w-0 px-2.5 hover:bg-gray-300/80 dark:hover:bg-gray-700 transition-colors">
                            <span className="material-symbols-outlined" style={{ fontSize: 20 }}>notifications</span>
                        </button>
                        <div 
                            className="bg-center bg-no-repeat aspect-square bg-cover rounded-full size-10" 
                            style={{
                                backgroundImage: user?.profilePicture 
                                    ? `url(${user.profilePicture})` 
                                    : `url("https://ui-avatars.com/api/?name=${encodeURIComponent(displayName)}&background=012d90&color=fff")`
                            }}
                        ></div>
                    </div>
                </header>

                {/* Page Content */}
                <div className="p-6">
                    {/* PageHeading */}
                    <div className="flex flex-wrap justify-between gap-3 mb-4">
                        <div className="flex min-w-72 flex-col gap-1">
                            <p className="text-gray-900 dark:text-white text-3xl font-black leading-tight tracking-[-0.033em]">
                                Welcome, {displayName}!
                            </p>
                            <p className="text-gray-600 dark:text-gray-400 text-sm font-normal leading-normal">
                                Here's a summary of your event activity.
                            </p>
                        </div>
                    </div>

                    {/* Upcoming Events Section */}
                    <section className="mb-6">
                        <h2 className="text-gray-900 dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] px-1 pb-2 pt-2">
                            Your Upcoming Events
                        </h2>
                        {loading ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div className="flex flex-col rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white dark:bg-gray-800 overflow-hidden">
                                    <div className="p-5 text-center">Loading...</div>
                                </div>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                {upcomingEvents.map((event, index) => (
                                    <div key={event._id || index} className="flex flex-col rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] bg-white dark:bg-gray-800 overflow-hidden">
                                        <div 
                                            className="w-full bg-center bg-no-repeat bg-cover" 
                                            style={{
                                                height: '120px',
                                                backgroundImage: event.image 
                                                    ? `url(${event.image})` 
                                                    : `url("https://via.placeholder.com/400x225?text=${encodeURIComponent(event.name || event.title || 'Event')}")`
                                            }}
                                        ></div>
                                        <div className="flex w-full grow flex-col gap-1.5 p-4">
                                            <p className="text-gray-500 dark:text-gray-400 text-sm font-medium leading-normal">
                                                {event.startDate 
                                                    ? formatDate(event.startDate) 
                                                    : event.date 
                                                    ? formatDate(event.date) 
                                                    : formatDate(event.createdAt)}
                                            </p>
                                            <p className="text-gray-900 dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">
                                                {event.name || event.title || 'Untitled Event'}
                                            </p>
                                            <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 text-sm">
                                                <span className="material-symbols-outlined text-sm">location_on</span>
                                                <span>{event.location || 'Location TBD'}</span>
                                            </div>
                                            <div className="mt-2">
                                                <Link
                                                    to={`/vendor/accepted`}
                                                    className="flex w-full min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-white text-sm font-medium leading-normal hover:bg-primary/90 transition-colors"
                                                >
                                                    <span className="truncate">View Details</span>
                                                </Link>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {upcomingEvents.length === 0 && (
                                    <div className="flex flex-col items-center justify-center rounded-xl bg-white/50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 text-center min-h-[200px]">
                                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">event_busy</span>
                                        <p className="text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm">No Upcoming Events</p>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">You have no scheduled events. Time to find a new opportunity!</p>
                                        <Link
                                            to="/vendor/bazaars"
                                            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 transition-colors"
                                        >
                                            <span className="truncate">Find An Event</span>
                                        </Link>
                                    </div>
                                )}
                                {upcomingEvents.length > 0 && upcomingEvents.length < 3 && (
                                    <div className="flex flex-col items-center justify-center rounded-xl bg-white/50 dark:bg-gray-800/50 border-2 border-dashed border-gray-300 dark:border-gray-600 p-4 text-center min-h-[200px]">
                                        <span className="material-symbols-outlined text-4xl text-gray-400 mb-2">add_circle</span>
                                        <p className="text-gray-700 dark:text-gray-300 font-bold mb-1 text-sm">No More Upcoming Events</p>
                                        <p className="text-gray-500 dark:text-gray-400 text-xs mb-3">You have no other scheduled events. Time to find a new opportunity!</p>
                                        <Link
                                            to="/vendor/bazaars"
                                            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-lg h-9 px-4 bg-primary text-white text-sm font-bold leading-normal tracking-[0.015em] hover:bg-blue-700 transition-colors"
                                        >
                                            <span className="truncate">Find An Event</span>
                                        </Link>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* My Event Applications & Notifications */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                        {/* Applications Table */}
                        <section className="xl:col-span-2">
                            <div className="flex justify-between items-center px-1 pb-2 pt-2">
                                <h2 className="text-gray-900 dark:text-white text-xl font-bold leading-tight tracking-[-0.015em]">
                                    Recent Application Status
                                </h2>
                                <Link 
                                    to="/vendor/requests" 
                                    className="text-sm font-semibold text-primary dark:text-yellow-400 hover:underline"
                                >
                                    View All Applications
                                </Link>
                            </div>
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)] overflow-x-auto">
                                {loading ? (
                                    <div className="p-4 text-center">Loading...</div>
                                ) : applications.length === 0 ? (
                                    <div className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">
                                        No applications yet. <Link to="/vendor/bazaars" className="text-primary dark:text-yellow-400 hover:underline">Find events to apply</Link>
                                    </div>
                                ) : (
                                    <table className="w-full text-left">
                                        <thead className="border-b border-gray-200 dark:border-gray-700">
                                            <tr>
                                                <th className="p-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Event Name</th>
                                                <th className="p-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Date Applied</th>
                                                <th className="p-3 text-xs font-semibold text-gray-600 dark:text-gray-400">Status</th>
                                                <th className="p-3 text-xs font-semibold text-gray-600 dark:text-gray-400"></th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {applications.map((app, index) => (
                                                <tr key={app._id || index} className="border-b border-gray-200 dark:border-gray-700">
                                                    <td className="p-3 font-medium text-sm text-gray-800 dark:text-gray-200">
                                                        {app.eventName || app.name || 'Untitled Event'}
                                                    </td>
                                                    <td className="p-3 text-sm text-gray-600 dark:text-gray-300">
                                                        {formatDate(app.createdAt || app.dateApplied)}
                                                    </td>
                                                    <td className="p-3">
                                                        {getStatusBadge(app.status)}
                                                    </td>
                                                    <td className="p-3 text-right">
                                                        <Link
                                                            to="/vendor/requests"
                                                            className="text-sm font-semibold text-primary dark:text-yellow-400 hover:underline"
                                                        >
                                                            View
                                                        </Link>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </section>

                        {/* Notifications */}
                        <section>
                            <h2 className="text-gray-900 dark:text-white text-xl font-bold leading-tight tracking-[-0.015em] px-1 pb-2 pt-2">
                                Notifications & Alerts
                            </h2>
                            {loading ? (
                                <div className="p-3 text-center text-sm">Loading...</div>
                            ) : notifications.length === 0 ? (
                                <div className="p-3 text-center text-sm text-gray-500 dark:text-gray-400">
                                    No notifications at this time.
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {notifications.map((notif, index) => {
                                        const iconConfig = getNotificationIcon(notif.icon);
                                        return (
                                            <div key={index} className="flex items-start gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
                                                <div className={`flex-shrink-0 size-7 ${iconConfig.bg} rounded-full flex items-center justify-center`}>
                                                    <span className={`material-symbols-outlined ${iconConfig.text}`} style={{ fontSize: 16 }}>
                                                        {notif.icon}
                                                    </span>
                                                </div>
                                                <div>
                                                    <p className="text-xs font-semibold text-gray-800 dark:text-gray-200">{notif.message}</p>
                                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{notif.time}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </section>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default VendorDashboard;
