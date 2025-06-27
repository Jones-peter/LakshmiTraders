
import type { SVGProps } from "react";
import { Leaf, Edit as EditIconLucide } from "lucide-react";

export const Icons = {
  Logo: (props: SVGProps<SVGSVGElement>) => (
    <Leaf className="h-6 w-6 text-primary" {...props} />
  ),
  Spinner: (props: SVGProps<SVGSVGElement>) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  ),
  Edit: (props: SVGProps<SVGSVGElement>) => (
    <EditIconLucide className="h-4 w-4" {...props} />
  ),
};

