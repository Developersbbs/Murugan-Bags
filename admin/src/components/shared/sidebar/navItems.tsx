import { MdOutlineDashboard } from "react-icons/md";
import { LuUsers2 } from "react-icons/lu";
import { TbPackages, TbTruckDelivery } from "react-icons/tb";
import { RiCoupon2Line } from "react-icons/ri";
import { TbTag } from "react-icons/tb";
import { TbBriefcase } from "react-icons/tb";
import { MdOutlineShoppingCart } from "react-icons/md";
import { MdOutlineViewCarousel } from "react-icons/md";
import { FaGift } from "react-icons/fa";
import { FaTag } from "react-icons/fa";
import { FaBullhorn } from "react-icons/fa";

export const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: <MdOutlineDashboard />,
  },
  {
    title: "Products",
    url: "/products",
    icon: <MdOutlineShoppingCart />,
  },
  {
    title: "Categories",
    url: "/categories",
    icon: <TbTag />,
  },
  {
    title: "Home Page",
    url: "#", // Parent item doesn't navigate
    icon: <MdOutlineDashboard />, // Using Dashboard icon as placeholder or import MdHome if available
    children: [
      {
        title: "Hero Section",
        url: "/hero-section",
        icon: <MdOutlineViewCarousel />,
      },
      {
        title: "Special Offers",
        url: "/special-offers",
        icon: <FaGift />,
      },
      {
        title: "Combo Offers",
        url: "/combo-offers",
        icon: <FaTag />,
      },
      {
        title: "Marquee Offers",
        url: "/marquee-offers",
        icon: <FaBullhorn />,
      },
      {
        title: "Offer Popups",
        url: "/offer-popups",
        icon: <FaGift />,
      },
    ]
  },

  {
    title: "Stocks",
    url: "/stock",
    icon: <TbPackages />,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: <LuUsers2 />,
  },
  {
    title: "Orders",
    url: "/orders",
    icon: <TbTruckDelivery />,
  },

  // {
  //   title: "Coupons",
  //   url: "/coupons",
  //   icon: <RiCoupon2Line />,
  // },
  // {
  //   title: "Staff",
  //   url: "/staff",
  //   icon: <TbBriefcase />,
  // },
];
