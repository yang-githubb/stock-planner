import { Link } from "react-router-dom";
import { FileQuestion } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";

export default function NotFoundPage() {
  return (
    <EmptyState
      icon={<FileQuestion size={48} />}
      title="Page not found"
      description="The page you're looking for doesn't exist or has been moved."
      action={
        <Link to="/">
          <Button variant="primary">Back to Dashboard</Button>
        </Link>
      }
    />
  );
}
