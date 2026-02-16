import { MdOutlineDashboard, MdRateReview } from "react-icons/md";
import { LuUsers } from "react-icons/lu";
import { TbPackages, TbTruckDelivery, TbChartBar, TbArchive } from "react-icons/tb";
import { RiCoupon2Line } from "react-icons/ri";
import { TbTag } from "react-icons/tb";
import { TbBriefcase } from "react-icons/tb";
import { MdOutlineShoppingCart } from "react-icons/md";
import { MdOutlineViewCarousel } from "react-icons/md";
import { FaGift } from "react-icons/fa";
import { FaTag } from "react-icons/fa";
import { FaBullhorn } from "react-icons/fa";
import { FaBox } from "react-icons/fa";

export const navItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: <MdOutlineDashboard />,
  },
  {
    title: "Orders",
    url: "/orders",
    icon: <TbTruckDelivery />,
  },
  {
    title: "Customers",
    url: "/customers",
    icon: <LuUsers />,
  },
  {
    title: "Categories",
    url: "/categories",
    icon: <TbTag />,
  },
  {
    title: "Products",
    url: "/products",
    icon: <MdOutlineShoppingCart />,
  },
  {
    title: "Archives",
    url: "/archives",
    icon: <TbArchive />,
  },
  {
    title: "Stocks",
    url: "/stock",
    icon: <TbPackages />,
  },
  {
    title: "Reviews",
    url: "/reviews",
    icon: <MdRateReview />,
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
        title: "Bulk Orders",
        url: "/bulk-orders",
        icon: <FaBox />,
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
      {
        title: "New Arrival Banners",
        url: "/new-arrival-banners",
        icon: <MdOutlineViewCarousel />,
      },
    ]
  },
  {
    title: "Analytics",
    url: "/analytics",
    icon: <TbChartBar />,
  },
  {
    title: "Reports",
    url: "#",
    icon: <TbChartBar />,
    children: [
      {
        title: "Wishlist & Cart",
        url: "/reports/wishlist-cart",
        icon: <MdOutlineShoppingCart />,
      }
    ]
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
