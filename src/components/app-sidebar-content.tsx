"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Stethoscope,
  CalendarDays,
  Settings,
  FileText,
  MessageSquare,
  Video,
  Bell,
  Activity,
  HeartPulse,
} from "lucide-react"

import { APP_NAME } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Logo } from "./logo"
import { Separator } from "./ui/separator"
import { Badge } from "./ui/badge"

const menuItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/patients", label: "Patients", icon: Users },
  { href: "/nurses", label: "Nurses", icon: Stethoscope },
  { href: "/appointments", label: "Appointments", icon: CalendarDays, badge: "3" },
]

const secondaryMenuItems = [
  { href: "/care-tracking", label: "Care Tracking", icon: Activity },
  { href: "/medical-files", label: "Medical Files", icon: FileText },
  { href: "/notifications", label: "Notifications", icon: Bell, badge: "New" },
  { href: "/chat", label: "Chat", icon: MessageSquare },
  { href: "/video-consult", label: "Video Consult", icon: Video },
]


export function AppSidebarContent() {
  const pathname = usePathname()

  const isActive = (path: string) => pathname === path || (path !== "/dashboard" && pathname.startsWith(path))


  return (
    <>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2 group-data-[collapsible=icon]:justify-center">
          <Logo />
          <Link href="/dashboard" className="group-data-[collapsible=icon]:hidden">
            <h1 className="font-semibold text-xl text-primary">{APP_NAME}</h1>
          </Link>
        </div>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {menuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  variant="default"
                  className={cn(
                    "w-full justify-start",
                    isActive(item.href)
                      ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  tooltip={item.label}
                >
                  <a>
                    <item.icon className="mr-2" />
                    <span className="group-data-[collapsible=icon]:hidden truncate">{item.label}</span>
                    {item.badge && <Badge variant="secondary" className="ml-auto group-data-[collapsible=icon]:hidden">{item.badge}</Badge>}
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
        <Separator className="my-4" />
         <SidebarMenu>
          {secondaryMenuItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  asChild
                  variant="default"
                  className={cn(
                    "w-full justify-start",
                    isActive(item.href)
                      ? "bg-sidebar-primary text-sidebar-primary-foreground hover:bg-sidebar-primary/90"
                      : "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                  tooltip={item.label}
                >
                  <a>
                    <item.icon className="mr-2" />
                    <span className="group-data-[collapsible=icon]:hidden truncate">{item.label}</span>
                     {item.badge && <Badge variant={item.label === "Notifications" ? "destructive" : "secondary"} className="ml-auto group-data-[collapsible=icon]:hidden">{item.badge}</Badge>}
                  </a>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      <SidebarFooter className="p-2">
        <Separator className="my-2" />
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/settings" legacyBehavior passHref>
              <SidebarMenuButton
                asChild
                variant="ghost"
                className={cn(
                  "w-full justify-start",
                  isActive("/settings") && "bg-sidebar-accent text-sidebar-accent-foreground"
                )}
                tooltip="Settings"
              >
                <a>
                  <Settings className="mr-2" />
                  <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                </a>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </>
  )
}
