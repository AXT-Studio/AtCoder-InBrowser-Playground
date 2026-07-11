/** Status 表示用の背景トーン（AC=緑, RE/CE=紫, TLE/WA=黄, 他=灰） */
export type StatusColor = "green" | "purple" | "yellow" | "gray";

export function statusColor(status: string): StatusColor {
    switch (status) {
        case "AC":
            return "green";
        case "RE":
        case "Solve RE":
        case "Naive RE":
        case "Gen RE":
        case "CE":
            return "purple";
        case "TLE":
        case "Solve TLE":
        case "Naive TLE":
        case "Gen TLE":
        case "WA":
            return "yellow";
        default:
            return "gray";
    }
}
