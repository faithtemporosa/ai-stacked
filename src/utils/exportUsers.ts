interface UserExportData {
  email: string;
  user_id: string;
  role: string;
  joined_date: string;
}

export function exportUsersToCSV(users: UserExportData[]) {
  if (users.length === 0) {
    return;
  }

  // CSV headers
  const headers = ["Email", "User ID", "Role", "Joined Date"];
  
  // Convert data to CSV format
  const csvData = [
    headers.join(","),
    ...users.map(user => 
      [
        `"${user.email || 'N/A'}"`,
        `"${user.user_id}"`,
        `"${user.role}"`,
        `"${user.joined_date}"`
      ].join(",")
    )
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", `users_export_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = "hidden";
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
