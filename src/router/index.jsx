import { createBrowserRouter } from "react-router-dom";
import ProtectedRoute from "../components/auth/ProtectedRoute";
import MainLayout from "../views/MainLayout";
import HomeView from "../views/HomeView";
import ErrorView from "../views/ErrorView";
import AuthEntryView from "../views/AuthEntryView";
import AuthenticatedLayout from "../components/layout/AuthenticatedLayout";

// Dashboard views load on demand, like the public routes below
const lazyView = (load) => async () => {
  const module = await load();
  return { Component: module.default };
};

export const router = createBrowserRouter([
  {
    path: "/",
    element: <MainLayout />,
    errorElement: <ErrorView />,
    children: [
      {
        index: true,
        element: <HomeView />,
      },
      {
        path: "join-technician",
        element: <AuthEntryView role="technician" />,
      },
      {
        path: "join-customer",
        element: <AuthEntryView role="customer" />,
      },
      {
        path: "register",
        lazy: async () => {
          const module = await import("../views/RegistrationView");
          return { Component: module.default };
        },
      },
      {
        path: "register/:role",
        lazy: async () => {
          const module = await import("../views/RegistrationView");
          return { Component: module.default };
        },
      },
      {
        path: "login",
        lazy: async () => {
          const module = await import("../views/LoginView");
          return { Component: module.default };
        },
      },
      {
        path: "forgot-password",
        lazy: async () => {
          const module = await import("../views/ForgotPasswordView");
          return { Component: module.default };
        },
      },
      {
        path: "login/:role",
        lazy: async () => {
          const module = await import("../views/LoginView");
          return { Component: module.default };
        },
      },
      {
        path: "dashboard/technician",
        element: (
          <ProtectedRoute role="technician">
            <AuthenticatedLayout role="technician" />
          </ProtectedRoute>
        ),
        children: [
          { index: true, lazy: lazyView(() => import("../views/TechnicianDashboardView")) },
          { path: 'gigs', lazy: lazyView(() => import("../views/AuthenticatedWorkView")) },
          { path: 'gigs/:gigId', lazy: lazyView(() => import("../views/TechnicianGigDetailsView")) },
          { path: 'instant', lazy: lazyView(() => import("../views/TechnicianInstantServicesView")) },
          { path: 'recruitment', lazy: lazyView(() => import("../views/TechnicianRecruitmentView")) },
          { path: 'profile', lazy: lazyView(() => import("../views/TechnicianProfileView")) },
          {
            path: 'portfolio',
            lazy: async () => {
              const module = await import("../views/TechnicianPortfolioView");
              return { Component: module.default };
            },
          },
        ],
      },
      {
        path: "dashboard/customer",
        element: (
          <ProtectedRoute role="customer">
            <AuthenticatedLayout role="customer" />
          </ProtectedRoute>
        ),
        children: [
          { index: true, lazy: lazyView(() => import("../views/CustomerDashboardView")) },
          { path: 'services', lazy: lazyView(() => import("../views/AuthenticatedWorkView")) },
          { path: 'profile', lazy: lazyView(() => import("../views/CustomerProfileView")) },
          { path: 'gigs/:gigId', lazy: lazyView(() => import("../views/CustomerGigDetailsView")) },
          { path: 'instant', lazy: lazyView(() => import("../views/CustomerInstantServicesView")) },
          { path: 'instant/:id', lazy: lazyView(() => import("../views/CustomerInstantDetailsView")) },
          { path: 'recruitment', lazy: lazyView(() => import("../views/CustomerRecruitmentView")) },
          { path: 'recruitment/:id', lazy: lazyView(() => import("../views/CustomerRecruitmentDetailsView")) },
        ],
      },
      {
        path: "services",
        lazy: async () => {
          const module = await import("../views/ServicesView");
          return { Component: module.default };
        },
      },
      {
        path: "services/:slug",
        lazy: async () => {
          const module = await import("../views/ServiceDetailsView");
          return { Component: module.default };
        },
      },
      {
        path: "categories/:id",
        lazy: async () => {
          const module = await import("../views/CategoryDetailsView");
          return { Component: module.default };
        },
      },
      {
        path: "about",
        lazy: async () => {
          const module = await import("../views/AboutView");
          return { Component: module.default };
        },
      },
      {
        path: "contact",
        lazy: async () => {
          const module = await import("../views/ContactView");
          return { Component: module.default };
        },
      },
    ],
  },
]);