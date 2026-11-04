import React from "react";

export function generateStaticParams() {
  return [{ id: "1" }];
}

export default function AdminApprovalDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

