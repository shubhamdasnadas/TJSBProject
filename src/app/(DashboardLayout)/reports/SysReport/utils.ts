// utils.ts
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import html2canvas from "html2canvas";


export const getAxiosConfig = () => ({
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${localStorage.getItem("zabbix_auth") || ""}`,
  },
});

// Add other pure functions here later, e.g.
export const downsampleData = (data: any[], maxPoints: number) => {
  if (data.length <= maxPoints) return [...data];
  const result: any[] = [];
  const step = Math.ceil(data.length / maxPoints);
  for (let i = 0; i < data.length; i += step) {
    result.push(data[i]);
  }
  if (result[result.length - 1]?.clock !== data[data.length - 1]?.clock) {
    result.push(data[data.length - 1]);
  }
  return result;
};
export const exportHistoryToPDF = async (title: string, host: string, data: any[], chartEl: HTMLDivElement | null) => {
  // your full PDF export logic
};

// You can move getAxiosConfig here too if you want