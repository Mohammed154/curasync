import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

/**
 * Generates and downloads a high-fidelity, optimized PDF report of the CuraSync dashboard metrics.
 * Integrates layout freezing, animation suppression, and crisp multi-device scale rasterization.
 * 
 * @returns {Promise<void>}
 */
export async function generateCuraSyncMetricsPDF() {
  if (typeof window === 'undefined') return;

  const containerId = 'curasync-charts-viewport';
  const target = document.getElementById(containerId);
  if (!target) {
    throw new Error(`Target container #${containerId} not found in the DOM.`);
  }

  // --- Step 2.1: Pre-Flight Optimization ---
  // Save original styling properties to restore post-capture
  const originalStyles = {
    width: target.style.width,
    height: target.style.height,
    minHeight: target.style.minHeight,
    maxHeight: target.style.maxHeight,
    overflow: target.style.overflow,
    position: target.style.position
  };

  // Lock physical dimensions to prevent responsive layouts from collapsing during render
  const bounds = target.getBoundingClientRect();
  target.style.width = `${bounds.width}px`;
  target.style.height = `${bounds.height}px`;
  target.style.minHeight = `${bounds.height}px`;
  target.style.maxHeight = 'none';
  target.style.overflow = 'hidden';

  // Inject styles to temporarily suppress animations, hover states, and tooltips
  const cssBypass = document.createElement('style');
  cssBypass.innerHTML = `
    #${containerId} .recharts-tooltip-wrapper,
    #${containerId} .chart-tooltip,
    #${containerId} [role="tooltip"],
    #${containerId} .tooltip {
      display: none !important;
      opacity: 0 !important;
      visibility: hidden !important;
      pointer-events: none !important;
    }
    #${containerId} * {
      transition: none !important;
      animation-duration: 0s !important;
      animation-delay: 0s !important;
    }
  `;
  document.head.appendChild(cssBypass);

  // Allow one macro-task tick for DOM styles and animation freeze to take effect
  await new Promise((resolve) => setTimeout(resolve, 150));

  try {
    // --- Step 2.2: Rasterization Pipeline ---
    const canvas = await html2canvas(target, {
      scale: 3, // Device scale factor of 3 to preserve text/graph vector crispness
      useCORS: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      width: bounds.width,
      height: bounds.height
    });

    const imgData = canvas.toDataURL('image/png');

    // --- Step 2.3: Vector Registration & Layout Planning ---
    // A4 Dimensions in Landscape: 297mm x 210mm
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = 297;
    const pageHeight = 210;
    const margin = 15; // 15mm outer layout safety margin
    const printableWidth = pageWidth - (margin * 2); // 267mm
    const headerHeight = 35; // Height reserved for header layout
    const printableHeight = pageHeight - margin - headerHeight; // 160mm

    // Calculate aspect ratio scaling to maintain proportions
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;
    const imageAspectRatio = canvasHeight / canvasWidth;

    let targetWidth = printableWidth;
    let targetHeight = printableWidth * imageAspectRatio;

    // Constraint check: if scaled height exceeds available page space, scale down via height bounds
    if (targetHeight > printableHeight) {
      targetHeight = printableHeight;
      targetWidth = targetHeight / imageAspectRatio;
    }

    // Centering calculations
    const xOffset = margin + (printableWidth - targetWidth) / 2;
    const yOffset = headerHeight + (printableHeight - targetHeight) / 2;

    // --- Step 2.4: Inject Corporate Meta-Elements ---
    // Header Title
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(18);
    pdf.setTextColor(18, 18, 23); // CuraSync Slate Navy color
    pdf.text('CuraSync Platform Node: Runtime Analytics Report', margin, 20);

    // Metadata Subheader
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(9);
    pdf.setTextColor(108, 115, 127); // Dark gray

    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC';
    const nodeId = window.crypto?.randomUUID?.()?.substring(0, 8)?.toUpperCase() || 'NODE-CS-LIVE';
    
    pdf.text(`Generated: ${timestamp}`, margin, 26);
    pdf.text(`Cluster Node ID: ${nodeId}   |   Env: Production-Replica`, margin, 30);

    // Decorative Separator Rule
    pdf.setDrawColor(229, 231, 235); // border-gray-200 equivalent
    pdf.setLineWidth(0.5);
    pdf.line(margin, 34, pageWidth - margin, 34);

    // --- Step 2.5: Document Emission ---
    // Draw rasterized element image
    pdf.addImage(imgData, 'PNG', xOffset, yOffset, targetWidth, targetHeight, undefined, 'FAST');

    // Footer Page Numbering
    pdf.setFontSize(8);
    pdf.setTextColor(156, 163, 175);
    pdf.text('Page 1 of 1', pageWidth - margin - 15, pageHeight - 10);

    // Generate output snapshot filename using semantic timestamp format
    const fileTimestamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    pdf.save(`curasync-metrics-snapshot-${fileTimestamp}.pdf`);

  } finally {
    // Clean up temporary style override blocks
    cssBypass.remove();

    // Restore original DOM container dimensions & styles
    Object.keys(originalStyles).forEach((key) => {
      (target.style as any)[key] = (originalStyles as any)[key];
    });
  }
}
