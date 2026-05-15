import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

interface NavItem {
  label: string;
  icon: string;
  path: string;
}

const studentNav: NavItem[] = [
  { label: "Map", icon: "🗺️", path: "/student/home" },
  { label: "Queue", icon: "🎫", path: "/student/queue" },
  { label: "Profile", icon: "👤", path: "/student/profile" },
];

const adminNav: NavItem[] = [
  { label: "Overview", icon: "🗺️", path: "/admin/dashboard" },
  { label: "Students", icon: "👥", path: "/admin/students" },
  { label: "Stops", icon: "📍", path: "/admin/stops" },
  { label: "Settings", icon: "⚙️", path: "/admin/settings" },
];

const driverNav: NavItem[] = [
  { label: 'Map', icon: '🗺️', path: '/driver/panel' },
  { label: 'Boarding', icon: '🚐', path: '/driver/boarding' },
  { label: 'Profile', icon: '👤', path: '/driver/profile' },
]

export default function BottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { role } = useAuth();

  const getNavItems = (): NavItem[] => {
    if (role === "admin") return adminNav;
    if (role === "driver") return driverNav;
    return studentNav;
  };

  const navItems = getNavItems();

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-zinc-900/95 backdrop-blur-sm border-t border-zinc-800">
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              className={`flex flex-col items-center gap-1 px-4 py-1.5 rounded-xl transition-colors ${
                isActive
                  ? "text-yellow-400"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
