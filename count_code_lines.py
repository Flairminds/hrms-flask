import os
import pandas as pd


def count_lines_in_file(file_path):
    """Count number of lines in a text file safely."""
    try:
        with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
            return sum(1 for _ in f)
    except Exception:
        return 0  # Skip unreadable files


def collect_loc_data(project_dir=".", ignore_folders=None, allowed_ext=None):
    if ignore_folders is None:
        ignore_folders = []
    if allowed_ext is None:
        allowed_ext = [".py", ".yml"]

    file_records = []
    folder_summary = {}

    for root, dirs, files in os.walk(project_dir):
        # Skip ignored folders
        if any(ignored in root for ignored in ignore_folders):
            continue

        folder_total = 0
        for file in files:
            if not any(file.lower().endswith(ext) for ext in allowed_ext):
                continue
            file_path = os.path.join(root, file)
            line_count = count_lines_in_file(file_path)
            folder_total += line_count

            file_records.append({
                "Folder": root,
                "File": file,
                "Lines": line_count
            })

        folder_summary[root] = folder_total

    return file_records, folder_summary


def export_to_excel(file_records, folder_summary):
    # File-wise DataFrame
    df_files = pd.DataFrame(file_records)

    # Sort files by line count (descending)
    if not df_files.empty:
        df_files = df_files.sort_values(by="Lines", ascending=False)

        # Add overall total at the bottom
        total_lines = df_files["Lines"].sum()
        df_files.loc[len(df_files.index)] = ["", "TOTAL", total_lines]

    # Folder summary DataFrame
    df_folders = pd.DataFrame(
        [{"Folder": folder, "Total Lines": lines} for folder, lines in folder_summary.items()]
    )

    if not df_folders.empty:
        df_folders = df_folders.sort_values(by="Total Lines", ascending=False)

        # Add overall total at the bottom
        total_lines = df_folders["Total Lines"].sum()
        df_folders.loc[len(df_folders.index)] = ["TOTAL", total_lines]
    
    return df_files, df_folders

if __name__ == "__main__":
    import sys

    # Usage: python count_loc.py <project_dir> <ignore_folder1> <ignore_folder2> ...
    # project_dir = sys.argv[1] if len(sys.argv) > 1 else "."
    project_dir = ["/Users/punit/Desktop/development/hrms-flask/app", "/Users/punit/Desktop/development/hrms-flask/frontend/src"]
    ignore_folders = ["__pycache__", "assets"]
    allowed_ext = [".py", ".yml", ".js", ".jsx", ".css"]

    data = []
    for project in project_dir:
        file_records, folder_summary = collect_loc_data(project, ignore_folders, allowed_ext)
        df_files, df_folders = export_to_excel(file_records, folder_summary)
        data.append([df_files, df_folders])
    
    # Write to Excel with 2 sheets
    with pd.ExcelWriter("loc_report.xlsx", engine="openpyxl") as writer:
        for i, df in enumerate(data):
            df[0].to_excel(writer, sheet_name=project_dir[i].split("/")[-1] + "Files", index=False)
            df[1].to_excel(writer, sheet_name=project_dir[i].split("/")[-1] + "Folders", index=False)
