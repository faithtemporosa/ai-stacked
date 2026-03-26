import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import AdminHeader from "@/components/AdminHeader";

const Analytics = () => {
  return (
    <>
      <AdminHeader />
      <div className="min-h-screen bg-background pt-20">
        <AnalyticsDashboard />
      </div>
    </>
  );
};

export default Analytics;
