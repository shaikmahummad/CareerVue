import React from "react";

export function generateStaticParams() {
  return [{ id: "1" }];
}

export default function CourseDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

