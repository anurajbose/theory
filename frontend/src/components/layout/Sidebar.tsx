import { NavLink } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, KanbanSquare, UserCheck, Clock,
  CalendarDays, Lightbulb, BookOpen, BarChart2,
  Globe, AlertTriangle, Settings, ChevronLeft, BarChart3, Radio,
} from 'lucide-react';
import { useAuthStore } from '../../store/authStore';
import { useBranding } from '../../theme/ThemeProvider';

interface NavItem { path: string; icon: React.ElementType; label: string; badge?: number }

// Intelligence-first IA. Daily loop + the signal surface up top;
// Board/Follow-ups are the work objects; Reports is analytics.
// Time Log, Meetings, Ideas, Knowledge are demoted out of primary
// nav (routes still work) so the product reads as an intelligence
// layer, not a tools junk drawer.
const COMMON: NavItem[] = [
  { path: '/daily',      icon: LayoutDashboard, label: 'Daily' },
  { path: '/signals',    icon: Radio,           label: 'Signals' },
  { path: '/board',      icon: KanbanSquare,    label: 'Board' },
  { path: '/follow-ups', icon: UserCheck,       label: 'Follow-ups' },
];

// One role-adaptive Intelligence surface replaces the old Manager
// console, Org Pulse and Reports trio. Visible to MANAGER+; the page
// itself adapts (Team vs Organisation) based on the user's role.
const MANAGER_ITEMS: NavItem[]    = [{ path: '/intelligence', icon: BarChart3, label: 'Intelligence' }];
const LEADERSHIP_ITEMS: NavItem[] = [];
const ADMIN_ITEMS: NavItem[] = [{ path: '/admin', icon: Settings, label: 'Admin' }];

interface Props { collapsed: boolean; onToggle: () => void }

function NavItemRow({ path, icon: Icon, label, badge, collapsed }: NavItem & { collapsed: boolean }) {
  return (
    <NavLink key={path} to={path} className="block">
      {({ isActive }) => (
        <motion.div
          whileTap={{ scale: 0.97 }}
          className={`
            relative flex items-center gap-3 select-none cursor-pointer
            transition-all duration-150 rounded-xl
            ${collapsed ? 'justify-center px-0 py-2.5 mx-1' : 'px-3 py-2.5 mx-1'}
          `}
          style={{
            background: isActive ? 'var(--m3-prim-c)' : 'transparent',
            color: isActive ? 'var(--m3-primary)' : 'var(--m3-on-surf-var)',
            boxShadow: isActive
              ? 'inset 0 0 0 1px color-mix(in srgb, var(--m3-primary) 22%, transparent), 0 6px 18px -10px color-mix(in srgb, var(--m3-primary) 60%, transparent)'
              : 'none',
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)';
              (e.currentTarget as HTMLElement).style.color = 'var(--m3-on-surf)';
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              (e.currentTarget as HTMLElement).style.background = 'transparent';
              (e.currentTarget as HTMLElement).style.color = 'var(--m3-on-surf-var)';
            }
          }}
        >
          {isActive && (
            <motion.span
              layoutId="nav-rail"
              className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full"
              style={{ background: 'var(--m3-primary)' }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            />
          )}

          <Icon
            size={18}
            strokeWidth={isActive ? 2.2 : 1.8}
            className="shrink-0"
          />

          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden whitespace-nowrap text-[13px] font-medium flex-1"
              >
                {label}
              </motion.span>
            )}
          </AnimatePresence>

          {/* Badge */}
          {badge !== undefined && badge > 0 && (
            <span
              className="ml-auto min-w-[18px] h-[18px] rounded-full flex items-center
                         justify-center text-[9px] font-bold px-1 shrink-0"
              style={{ background: 'var(--m3-error)', color: '#fff' }}
            >
              {badge > 9 ? '9+' : badge}
            </span>
          )}

          {/* Tooltip on collapse */}
          {collapsed && (
            <motion.span
              initial={{ opacity: 0, x: -6 }}
              whileHover={{ opacity: 1, x: 0 }}
              className="pointer-events-none absolute left-full ml-3 px-3 py-1.5
                         rounded-xl text-xs font-medium whitespace-nowrap z-50
                         border shadow-e3"
              style={{
                background: 'var(--m3-surf4)',
                color: 'var(--m3-on-surf)',
                borderColor: 'var(--m3-outline-v)',
                opacity: 0,
              }}
            >
              {label}
            </motion.span>
          )}
        </motion.div>
      )}
    </NavLink>
  );
}

function SectionDivider({ label, collapsed }: { label: string; collapsed: boolean }) {
  return (
    <div className={`mx-2 mt-3 mb-1 ${collapsed ? 'flex justify-center' : ''}`}>
      {collapsed
        ? <div className="w-5 h-px" style={{ background: 'var(--m3-outline-v)' }} />
        : (
          <span
            className="text-[10px] font-semibold uppercase tracking-widest px-2"
            style={{ color: 'var(--m3-on-surf-var)', opacity: 0.45 }}
          >
            {label}
          </span>
        )
      }
    </div>
  );
}

export default function Sidebar({ collapsed, onToggle }: Props) {
  const role = useAuthStore((s) => s.user?.role);
  const { brandName } = useBranding();
  const brand = (brandName || 'theory').toLowerCase();

  const hasManager    = role === 'MANAGER' || role === 'ADMIN';
  const hasLeadership = role === 'LEADERSHIP' || role === 'ADMIN';
  const hasAdmin      = role === 'ADMIN';

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 236 }}
      transition={{ duration: 0.26, ease: [0.2, 0, 0, 1] }}
      className="relative flex flex-col shrink-0 h-screen overflow-hidden z-20"
      style={{
        background: 'color-mix(in srgb, var(--m3-surf0) 78%, transparent)',
        backdropFilter: 'blur(22px) saturate(1.4)',
        WebkitBackdropFilter: 'blur(22px) saturate(1.4)',
        borderRight: '1px solid var(--m3-outline-v)',
      }}
    >

      {/* ── Logo ── */}
      <div className="flex items-center px-4 shrink-0" style={{ height: 60 }}>
        <AnimatePresence mode="wait">
          {collapsed ? (
            <motion.div
              key="icon"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.16 }}
              className="w-full flex justify-center"
            >
              {/* Mini logo mark — P in accent color */}
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center font-black text-sm"
                style={{ background: 'var(--m3-prim-c)', color: 'var(--m3-primary)' }}
              >
                {brand.charAt(0).toUpperCase()}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="wordmark"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col leading-none gap-0.5 pl-1"
            >
              <div className="flex items-baseline gap-1.5">
                <span
                  style={{
                    fontFamily: "'Cormorant Garamond', serif",
                    fontStyle: 'italic',
                    fontWeight: 600,
                    fontSize: '1.45rem',
                    color: 'var(--m3-on-surf)',
                    lineHeight: 1,
                  }}
                >
                  {brand}
                </span>
              </div>
              <span
                className="text-[9px] font-medium tracking-wider pl-0.5"
                style={{ color: 'var(--m3-on-surf-var)', opacity: 0.5, letterSpacing: '0.10em' }}
              >
                work intelligence
              </span>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Hairline under logo ── */}
      <div className="mx-3 mb-2 h-px" style={{ background: 'var(--m3-outline-v)' }} />

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto py-1 space-y-0.5">
        {COMMON.map((item) => (
          <NavItemRow key={item.path} {...item} collapsed={collapsed} />
        ))}

        {hasManager && (
          <>
            <SectionDivider label="Team" collapsed={collapsed} />
            {MANAGER_ITEMS.map((item) => (
              <NavItemRow key={item.path} {...item} collapsed={collapsed} />
            ))}
          </>
        )}

        {hasLeadership && LEADERSHIP_ITEMS.length > 0 && (
          <>
            <SectionDivider label="Org" collapsed={collapsed} />
            {LEADERSHIP_ITEMS.map((item) => (
              <NavItemRow key={item.path} {...item} collapsed={collapsed} />
            ))}
          </>
        )}

        {hasAdmin && (
          <>
            <SectionDivider label="System" collapsed={collapsed} />
            {ADMIN_ITEMS.map((item) => (
              <NavItemRow key={item.path} {...item} collapsed={collapsed} />
            ))}
          </>
        )}
      </nav>

      {/* ── Bottom: collapse toggle ── */}
      <div className="px-2 pb-3 pt-2" style={{ borderTop: '1px solid var(--m3-outline-v)' }}>
        <motion.button
          onClick={onToggle}
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          className={`w-full flex items-center rounded-xl py-2.5 text-xs font-medium
                      transition-all duration-150
                      ${collapsed ? 'justify-center px-0' : 'gap-2 px-3'}`}
          style={{ color: 'var(--m3-on-surf-var)' }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'var(--state-hover)';
            (e.currentTarget as HTMLElement).style.color = 'var(--m3-on-surf)';
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.background = 'transparent';
            (e.currentTarget as HTMLElement).style.color = 'var(--m3-on-surf-var)';
          }}
        >
          <motion.span
            animate={{ rotate: collapsed ? 0 : 180 }}
            transition={{ duration: 0.22, ease: [0.2, 0, 0, 1] }}
          >
            <ChevronLeft size={16} />
          </motion.span>
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden whitespace-nowrap"
              >
                Collapse
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
      </div>
    </motion.aside>
  );
}
