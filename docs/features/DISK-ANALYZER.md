# Disk usage analyzer

A built-in rings (sunburst) chart showing what takes up space inside a folder.
It works on local paths only; for other locations Mariner shows the toast
"Disk usage is only available for local folders".

## Opening it

- Right-click a folder and choose **Analyze Disk Usage**.
- Right-click empty space in a folder view (the background menu) to analyze the
  current folder.
- Drive entries in the Computer view also offer **Analyze Disk Usage**.

This opens the Properties dialog with the **Disk Usage** section expanded and
the scan started. You can also open Properties on a folder yourself and press
**Scan** on the Disk Usage row. Nothing scans until you ask.

## Reading the chart

- The scanned folder is the centre disc. Each ring outward is one level of the
  tree, up to five rings.
- Each wedge is a file or folder, sized by its share of its parent.
- Wedges fill in as the scan progresses, largest first.
- Hover a wedge to highlight it and its ancestors, and to see a tooltip with
  its name and size.
- Very small slivers are not drawn, but their size still counts toward their
  parent.
- The Disk Usage row subtitle shows the total size with file and folder counts.

## Drilling in

Click a folder wedge to make it the new centre. A header with a **Back** button
and the folder name appears; Back goes up one level. Drilling in and going back
re-roots the already-scanned tree and does not rescan.

## Scan behavior

- Hidden files and folders are included.
- Symlinked folders are counted but not followed.
- Unreadable folders are skipped.
- Closing the dialog cancels the scan.
