"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import {
  HomeIcon,
  ChartBarIcon,
  ArchiveBoxIcon,
  DocumentChartBarIcon,
  BellAlertIcon,
  UserIcon,
  Cog6ToothIcon,
  ChevronDownIcon
} from "@heroicons/react/24/outline";

const menuItems = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: HomeIcon
  },

  {
    name: "Monitoring",
    icon: ChartBarIcon,
    children: [
      { name: "Problems", href: "/monitoring/problems" },
      { name: "Hosts", href: "/monitoring/hosts" },
      { name: "Latest Data", href: "/monitoring/latest-data" },
      { name: "Maps", href: "/monitoring/maps" }
    ]
  },

  {
    name: "Inventory",
    href: "/inventory",
    icon: ArchiveBoxIcon
  },

  {
    name: "Reports",
    href: "/reports",
    icon: DocumentChartBarIcon
  },

  {
    name: "Alerts",
    href: "/alerts",
    icon: BellAlertIcon
  },

  {
    name: "Users",
    href: "/users",
    icon: UserIcon
  },

  {
    name: "Administration",
    href: "/administration",
    icon: Cog6ToothIcon
  }
];

export default function Sidebar() {
  const pathname = usePathname();

  // track which menu is open
  const [openMenu, setOpenMenu] = useState<string | null>(null);

  const toggleMenu = (name: string) => {
    setOpenMenu(openMenu === name ? null : name);
  };

  return (
    <div className="w-64 bg-white/70 backdrop-blur-xl border-r border-gray-200 h-screen p-6 flex flex-col shadow-lg">
      <h1 className="text-2xl font-bold text-blue-900 mb-8">Techsec NMS</h1>

      <nav className="flex flex-col space-y-2">

        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            (item.href && pathname.startsWith(item.href)) ||
            (item.children &&
              item.children.some((child) => pathname.startsWith(child.href)));

          // ---- If item has children (collapsible) ----
          if (item.children) {
            const isOpen = openMenu === item.name;

            return (
              <div key={item.name}>
                <button
                  onClick={() => toggleMenu(item.name)}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-lg transition-all
                  ${
                    isActive
                      ? "bg-blue-600 text-white shadow-md"
                      : "text-gray-700 hover:bg-blue-100"
                  }
                `}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    {item.name}
                  </div>

                  <ChevronDownIcon
                    className={`h-4 w-4 transform transition-transform ${
                      isOpen ? "rotate-180" : "rotate-0"
                    }`}
                  />
                </button>

                {/* Collapsible children */}
                {isOpen && (
                  <div className="ml-8 mt-2 flex flex-col space-y-1">
                    {item.children.map((child) => {
                      const childActive = pathname.startsWith(child.href);

                      return (
                        <Link
                          key={child.name}
                          href={child.href}
                          className={`px-3 py-1 rounded-md text-sm transition-all
                            ${
                              childActive
                                ? "bg-blue-500 text-white shadow"
                                : "text-gray-600 hover:bg-blue-100"
                            }
                          `}
                        >
                          {child.name}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          // ---- Regular (non-collapsible) items ----
          return (
            <Link
              key={item.name}
              href={item.href!}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-all
                ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-gray-700 hover:bg-blue-100"
                }
              `}
            >
              <Icon className="h-5 w-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
