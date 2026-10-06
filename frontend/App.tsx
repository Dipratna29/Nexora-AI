import React from "react";
import AppNavigator from "./src/navigation/AppNavigator";
import ErrorBoundary from "./src/components/common/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <AppNavigator />
    </ErrorBoundary>
  );
}