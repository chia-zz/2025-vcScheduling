// 初始化数据
document.addEventListener("DOMContentLoaded", function () {
  initializeApp();
});

function initializeApp() {
  // 设置标签页切换
  setupTabs();

  // 初始化员工数据
  initializeEmployeeData();

  // 初始化月份选择器
  initializeMonthSelector();

  // 初始化排班表
  generateCalendar();

  // 初始化按钮事件
  setupButtonEvents();

  // 加载保存的数据
  loadSavedData();
}

// 员工数据
let employees = {
  A: {
    name: "正職A",
    type: "fulltime",
    fixedDaysOff: [3, 4], // 周三、周四
    unavailableDates: ["11/10", "11/11", "11/12", "11/13", "11/14"], // 11/10-11/14出國排休
    preferredShifts: ["day"],
    color: "#ffc0cb",
  },
  B: {
    name: "兼職B",
    type: "parttime",
    fixedDaysOff: [0, 1], // 周日、周一
    unavailableDates: ["11/26"],
    preferredShifts: ["day"],
    color: "#ace9ac",
  },
  C: {
    name: "兼職C",
    type: "parttime",
    fixedDaysOff: [],
    unavailableDates: ["11/16", "11/17"], // 11/16.17不行
    specialDates: {
      "11/13": ["night"], // 11/13.14只能晚上
      "11/14": ["night"],
    },
    preferredShifts: ["night"], // 以晚班為主
    color: "#f4dd6d",
  },
  D: {
    name: "兼職D",
    type: "parttime",
    fixedDaysOff: [],
    unavailableDates: [],
    availableDates: ["11/8", "11/22", "11/29"], // 只有這些日期可以上晚班
    preferredShifts: ["night"],
    color: "#4db3f3",
    // 特殊班次時間
    specialShiftTimes: {
      weekend: {
        night: { start: "16:45", end: "24:15", hours: 7.5 },
      },
    },
  },
  E: {
    name: "兼職E",
    type: "parttime",
    fixedDaysOff: [],
    unavailableDates: ["11/4", "11/14", "11/20", "11/21", "11/23"],
    preferredShifts: ["day", "short"],
    color: "#b9aaf5",
  },
  F: {
    name: "兼職F",
    type: "parttime",
    fixedDaysOff: [],
    unavailableDates: ["11/1", "11/2", "11/10", "11/11", "11/21", "11/22"],
    preferredShifts: ["night", "short"],
    color: "#ffc080",
    maxNightShiftsPerWeek: 2, // 一週最多排兩天晚班
  },
};

// 班别时间 - 更新兼職D的特殊時間
const shiftTimes = {
  weekday: {
    day: { start: "10:30", end: "18:30", hours: 8 },
    night: { start: "18:15", end: "24:15", hours: 6 },
  },
  weekend: {
    day: { start: "09:50", end: "17:50", hours: 8 },
    short: { start: "12:00", end: "16:00", hours: 4 },
    night: { start: "16:15", end: "24:15", hours: 8 },
  },
};

// 人力需求
const staffingRequirements = {
  weekday: {
    day: 1,
    night: 1,
  },
  weekend: {
    day: 1, // 另一人为短班
    short: 1,
    night: 1,
  },
};

// 特殊日期数据
let specialDatesData = {
  // 格式: "2025-11": { holidays: [], closed: [], adjusted: {} }
};

// 排班表数据
let scheduleData = {};

// 当前查看的月份
let currentMonth = {
  year: 2025,
  month: 10, // 0-indexed, 10 = November
};

// 當前編輯狀態
let currentEditState = {
  date: null,
  shiftType: null,
  employee: null,
};

// 设置标签页切换
function setupTabs() {
  const tabs = document.querySelectorAll(".nav-link");
  tabs.forEach((tab) => {
    tab.addEventListener("click", function (e) {
      e.preventDefault();

      // 移除所有活动标签
      tabs.forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-pane").forEach((pane) => {
        pane.classList.remove("show", "active");
      });

      // 激活当前标签
      this.classList.add("active");
      const targetId = this.id.replace("-tab", "");
      document.getElementById(targetId).classList.add("show", "active");

      // 如果是特殊日期分页，更新显示
      if (targetId === "special") {
        updateSpecialDatesDisplay();
      }
    });
  });
}

// 初始化月份选择器
function initializeMonthSelector() {
  const monthSelect = document.getElementById("month-select");
  const specialMonthSelect = document.getElementById("special-month-select");

  // 清空现有选项
  monthSelect.innerHTML = "";
  specialMonthSelect.innerHTML = "";

  // 获取已保存的月份
  const savedMonths = getSavedMonths();

  if (savedMonths.length === 0) {
    // 添加默认月份
    addMonthOption(monthSelect, "2025-11", "2025年11月");
    addMonthOption(specialMonthSelect, "2025-11", "2025年11月");
    currentMonth = { year: 2025, month: 10 };
  } else {
    // 添加已保存的月份
    savedMonths.forEach((monthKey) => {
      const [year, month] = monthKey.split("-");
      const monthName = `${year}年${parseInt(month)}月`;
      addMonthOption(monthSelect, monthKey, monthName);
      addMonthOption(specialMonthSelect, monthKey, monthName);
    });

    // 设置当前月份为第一个选项
    const firstMonth = savedMonths[0];
    monthSelect.value = firstMonth;
    specialMonthSelect.value = firstMonth;
    const [year, month] = firstMonth.split("-");
    currentMonth = { year: parseInt(year), month: parseInt(month) - 1 };
  }

  // 添加月份选择事件
  monthSelect.addEventListener("change", function () {
    const [year, month] = this.value.split("-");
    currentMonth = { year: parseInt(year), month: parseInt(month) - 1 };
    loadScheduleForMonth();
    generateCalendar();
  });

  specialMonthSelect.addEventListener("change", function () {
    updateSpecialDatesDisplay();
  });
}

// 添加月份选项
function addMonthOption(selectElement, value, text) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = text;
  selectElement.appendChild(option);
}

// 获取已保存的月份
function getSavedMonths() {
  const months = [];

  // 从localStorage获取所有保存的月份
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key.startsWith("scheduleData-")) {
      const monthKey = key.replace("scheduleData-", "");
      months.push(monthKey);
    }
  }

  // 如果没有保存的月份，添加默认月份
  if (months.length === 0) {
    months.push("2025-11");
  }

  return months.sort();
}

// 初始化员工数据
function initializeEmployeeData() {
  // 如果localStorage中有保存的数据，则使用保存的数据
  const savedEmployees = localStorage.getItem("employeeData");
  if (savedEmployees) {
    employees = JSON.parse(savedEmployees);
  }

  // 生成员工规则表单
  generateEmployeeRulesForm();
}

// 生成员工规则表单
function generateEmployeeRulesForm() {
  const container = document.getElementById("employee-rules");
  container.innerHTML = "";

  Object.keys(employees).forEach((empId) => {
    const emp = employees[empId];
    const empDiv = document.createElement("div");
    empDiv.className = "form-section";

    const typeText = emp.type === "fulltime" ? "正職" : "兼職";

    empDiv.innerHTML = `
                    <h5>${emp.name} (${typeText})</h5>
                    <div class="row mb-3">
                        <div class="col-md-6">
                            <label class="form-label">員工名稱：</label>
                            <input type="text" class="form-control employee-name" data-emp="${empId}" value="${
      emp.name
    }">
                        </div>
                        <div class="col-md-6">
                            <label class="form-label">員工類型：</label>
                            <select class="form-select employee-type" data-emp="${empId}">
                                <option value="fulltime" ${
                                  emp.type === "fulltime" ? "selected" : ""
                                }>正職</option>
                                <option value="parttime" ${
                                  emp.type === "parttime" ? "selected" : ""
                                }>兼職</option>
                            </select>
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">固定休假星期：</label>
                        <div class="day-checkboxes">
                            ${generateDayCheckboxes(empId, emp.fixedDaysOff)}
                        </div>
                    </div>
                    <div class="mb-3">
                        <label class="form-label">${
                          emp.type === "fulltime"
                            ? "額外休假天數"
                            : "不可上班日期（如：10/12,10/15）"
                        }：</label>
                        <input type="text" class="form-control employee-unavailable" data-emp="${empId}" value="${
      emp.unavailableDates ? emp.unavailableDates.join(",") : ""
    }">
                    </div>
                    <div class="mb-3">
                        <label class="form-label">可上班班次：</label>
                        <div>
                            ${generateShiftCheckboxes(
                              empId,
                              emp.preferredShifts,
                              emp.type
                            )}
                        </div>
                    </div>
                    ${
                      emp.type === "parttime"
                        ? `
                    <div class="mb-3">
                        <label class="form-label">特殊日期限制（日期:班次，如：11/13:night,11/14:night）：</label>
                        <input type="text" class="form-control employee-special" data-emp="${empId}" value="${formatSpecialDates(
                            emp.specialDates
                          )}">
                    </div>
                    `
                        : ""
                    }
                    <div class="mb-3">
                        <button class="btn btn-sm btn-outline-danger remove-employee" data-emp="${empId}">移除員工</button>
                    </div>
                `;

    container.appendChild(empDiv);
  });

  // 添加移除员工事件
  document.querySelectorAll(".remove-employee").forEach((button) => {
    button.addEventListener("click", function () {
      const empId = this.getAttribute("data-emp");
      if (confirm(`確定要移除員工 ${employees[empId].name} 嗎？`)) {
        delete employees[empId];
        generateEmployeeRulesForm();
      }
    });
  });

  // 添加员工名称和类型变更事件
  document.querySelectorAll(".employee-name").forEach((input) => {
    input.addEventListener("change", function () {
      const empId = this.getAttribute("data-emp");
      employees[empId].name = this.value;
    });
  });

  document.querySelectorAll(".employee-type").forEach((select) => {
    select.addEventListener("change", function () {
      const empId = this.getAttribute("data-emp");
      employees[empId].type = this.value;
      generateEmployeeRulesForm();
    });
  });

  // 添加不可上班日期变更事件
  document.querySelectorAll(".employee-unavailable").forEach((input) => {
    input.addEventListener("change", function () {
      const empId = this.getAttribute("data-emp");
      const dates = this.value
        .split(",")
        .map((d) => d.trim())
        .filter((d) => d);
      employees[empId].unavailableDates = dates;
    });
  });

  // 添加特殊日期变更事件
  document.querySelectorAll(".employee-special").forEach((input) => {
    input.addEventListener("change", function () {
      const empId = this.getAttribute("data-emp");
      const specialDates = {};
      this.value.split(",").forEach((item) => {
        const [date, shift] = item.split(":").map((s) => s.trim());
        if (date && shift) {
          specialDates[date] = shift.split("|");
        }
      });
      employees[empId].specialDates = specialDates;
    });
  });
}

// 生成星期选择框
function generateDayCheckboxes(empId, selectedDays) {
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return days
    .map(
      (day, index) => `
                <div class="day-checkbox-item">
                    <input type="checkbox" id="${empId}-day-${index}" class="day-checkbox" data-emp="${empId}" data-day="${index}" ${
        selectedDays.includes(index) ? "checked" : ""
      }>
                    <label for="${empId}-day-${index}">${day}</label>
                </div>
            `
    )
    .join("");
}

// 生成班次选择框
function generateShiftCheckboxes(empId, selectedShifts, type) {
  const shifts =
    type === "fulltime"
      ? [{ id: "day", name: "白天" }]
      : [
          { id: "day", name: "白天" },
          { id: "night", name: "晚上" },
          { id: "short", name: "假日短班" },
        ];

  return shifts
    .map(
      (shift) => `
                <div class="form-check form-check-inline">
                    <input class="form-check-input shift-checkbox" type="checkbox" id="${empId}-shift-${
        shift.id
      }" data-emp="${empId}" data-shift="${shift.id}" ${
        selectedShifts.includes(shift.id) ? "checked" : ""
      }>
                    <label class="form-check-label" for="${empId}-shift-${
        shift.id
      }">${shift.name}</label>
                </div>
            `
    )
    .join("");
}

// 格式化特殊日期
function formatSpecialDates(specialDates) {
  if (!specialDates) return "";
  return Object.keys(specialDates)
    .map((date) => `${date}:${specialDates[date].join("|")}`)
    .join(",");
}

// 生成日历
function generateCalendar() {
  const container = document.getElementById("calendar-container");
  const year = currentMonth.year;
  const month = currentMonth.month;

  // 更新标题
  document.getElementById("schedule-title").textContent = `${year}年${
    month + 1
  }月排班表`;

  // 获取该月的第一天和最后一天
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();

  // 创建日历表格
  let calendarHTML = '<table class="calendar">';

  // 表头
  calendarHTML += "<thead><tr>";
  const weekdays = ["一", "二", "三", "四", "五", "六", "日"];
  weekdays.forEach((day) => {
    calendarHTML += `<th>${day}</th>`;
  });
  calendarHTML += "</tr></thead>";

  // 表格主体
  calendarHTML += "<tbody>";

  // 计算第一天是星期几（0=周日, 1=周一, ...）
  let firstDayOfWeek = firstDay.getDay();
  // 调整为周一为一周的第一天
  firstDayOfWeek = firstDayOfWeek === 0 ? 6 : firstDayOfWeek - 1;

  // 当前日期
  let currentDate = 1;

  // 生成日历行
  for (let i = 0; i < 6; i++) {
    calendarHTML += "<tr>";

    for (let j = 0; j < 7; j++) {
      if (i === 0 && j < firstDayOfWeek) {
        // 上个月的日期
        calendarHTML += "<td></td>";
      } else if (currentDate > daysInMonth) {
        // 下个月的日期
        calendarHTML += "<td></td>";
      } else {
        // 当前月的日期
        const dateStr = `${month + 1}/${currentDate}`;
        const dayOfWeek = (firstDayOfWeek + currentDate - 1) % 7;
        const isWeekend = dayOfWeek === 5 || dayOfWeek === 6; // 周六或周日

        // 获取特殊日期信息
        const monthKey = `${year}-${month + 1}`;
        const specialDates = specialDatesData[monthKey] || {
          holidays: [],
          closed: [],
          adjusted: {},
        };
        const isHoliday = specialDates.holidays.includes(dateStr);
        const isClosed = specialDates.closed.includes(dateStr);

        let cellClass = "";
        if (isClosed) {
          cellClass = "closed";
        } else if (isHoliday) {
          cellClass = "holiday";
        } else if (isWeekend) {
          cellClass = "weekend";
        }

        calendarHTML += `<td class="${cellClass}" data-date="${dateStr}">`;
        calendarHTML += `<div class="date-number">${currentDate}</div>`;

        // 添加排班信息
        if (scheduleData[dateStr]) {
          Object.keys(scheduleData[dateStr]).forEach((shiftType) => {
            const assignment = scheduleData[dateStr][shiftType];
            if (assignment) {
              const emp = employees[assignment.employee];
              let shiftInfo = isWeekend
                ? shiftTimes.weekend[shiftType]
                : shiftTimes.weekday[shiftType];

              // 處理兼職D的特殊班次時間
              if (
                assignment.employee === "D" &&
                isWeekend &&
                shiftType === "night" &&
                emp.specialShiftTimes
              ) {
                shiftInfo = emp.specialShiftTimes.weekend.night;
              }

              // 处理特殊调整
              let hours = shiftInfo.hours;
              let timeDisplay = `${shiftInfo.start}-${shiftInfo.end}`;

              if (specialDates.adjusted[dateStr]) {
                // 这里可以根据具体调整修改时间和时数
                // 例如：if (dateStr === '11/17' && shiftType === 'day') { ... }
              }

              calendarHTML += `
                                        <div class="shift-info employee-${
                                          assignment.employee
                                        }" data-shift="${shiftType}">
                                            ${
                                              assignment.employee
                                            } ${timeDisplay}(${hours}${
                isHoliday ? "*2" : ""
              })
                                        </div>
                                    `;
            }
          });
        }

        calendarHTML += "</td>";
        currentDate++;
      }
    }

    calendarHTML += "</tr>";

    // 如果已经显示完所有日期，提前结束
    if (currentDate > daysInMonth) {
      break;
    }
  }

  calendarHTML += "</tbody></table>";
  container.innerHTML = calendarHTML;

  // 添加点击事件处理
  setupCalendarClickEvents();

  // 生成统计信息
  generateStatistics();
}

// 设置日历点击事件
function setupCalendarClickEvents() {
  const calendarCells = document.querySelectorAll(".calendar td[data-date]");
  calendarCells.forEach((cell) => {
    cell.addEventListener("click", function () {
      const date = this.getAttribute("data-date");
      openEditModal(date);
    });
  });
}

// 打开编辑模态框
function openEditModal(date) {
  currentEditState.date = date;
  currentEditState.shiftType = null;
  currentEditState.employee = null;

  // 更新模态框标题
  document.getElementById("edit-date-title").textContent = `編輯 ${date} 排班`;

  // 获取日期信息
  const dateNum = parseInt(date.split("/")[1]);
  const dayOfWeek = new Date(
    currentMonth.year,
    currentMonth.month,
    dateNum
  ).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const dayNames = ["日", "一", "二", "三", "四", "五", "六"];

  document.getElementById("edit-date-info").textContent = `${
    currentMonth.year
  }年${date} (星期${dayNames[dayOfWeek]}) ${isWeekend ? "週末" : "平日"}`;

  // 生成班次选项
  generateShiftOptions(isWeekend, date);

  // 生成员工选项
  generateEmployeeOptions();

  // 显示模态框
  document.getElementById("edit-modal").style.display = "flex";

  // 清除验证消息
  document.getElementById("validation-message").textContent = "";
}

// 生成班次选项
function generateShiftOptions(isWeekend, date) {
  const container = document.getElementById("shift-options");
  container.innerHTML = "";

  const shifts = isWeekend ? ["day", "short", "night"] : ["day", "night"];

  // 特殊处理：某些日期不需要特定班次
  // 例如：if (date === '11/7') { shifts.splice(shifts.indexOf('night'), 1); }

  shifts.forEach((shiftType) => {
    let shiftInfo = isWeekend
      ? shiftTimes.weekend[shiftType]
      : shiftTimes.weekday[shiftType];

    // 檢查是否有員工有特殊班次時間（如兼職D）
    let hours = shiftInfo.hours;
    let timeDisplay = `${shiftInfo.start}-${shiftInfo.end}`;

    // 处理特殊调整
    const monthKey = `${currentMonth.year}-${currentMonth.month + 1}`;
    const specialDates = specialDatesData[monthKey] || {
      holidays: [],
      closed: [],
      adjusted: {},
    };

    if (specialDates.adjusted[date]) {
      // 这里可以根据具体调整修改时间和时数
      // 例如：if (date === '11/17' && shiftType === 'day') { ... }
    }

    const shiftName = getShiftName(shiftType);

    const option = document.createElement("div");
    option.className = "edit-option";
    option.setAttribute("data-shift", shiftType);
    option.innerHTML = `
                    <div><strong>${shiftName}</strong></div>
                    <div>${timeDisplay}</div>
                    <div>(${hours}小時)</div>
                `;

    option.addEventListener("click", function () {
      // 移除其他选项的选中状态
      document
        .querySelectorAll("#shift-options .edit-option")
        .forEach((opt) => {
          opt.classList.remove("selected");
        });

      // 设置当前选项为选中状态
      this.classList.add("selected");
      currentEditState.shiftType = shiftType;

      // 更新员工选项
      generateEmployeeOptions();
    });

    container.appendChild(option);
  });
}

// 获取班次名称
function getShiftName(shiftType) {
  const names = {
    day: "白天班",
    night: "晚班",
    short: "短班",
  };
  return names[shiftType] || shiftType;
}

// 生成员工选项
function generateEmployeeOptions() {
  const container = document.getElementById("employee-options");
  container.innerHTML = "";

  if (!currentEditState.shiftType) {
    container.innerHTML = '<div class="text-muted">請先選擇班次</div>';
    return;
  }

  const date = currentEditState.date;
  const dateNum = parseInt(date.split("/")[1]);
  const dayOfWeek = new Date(
    currentMonth.year,
    currentMonth.month,
    dateNum
  ).getDay();

  // 获取可用员工
  const availableEmployees = getAvailableEmployees(
    date,
    dayOfWeek,
    currentEditState.shiftType
  );

  if (availableEmployees.length === 0) {
    container.innerHTML = '<div class="text-muted">無可用員工</div>';
    return;
  }

  // 获取当前已安排的员工（如果有）
  const currentAssignment =
    scheduleData[date] && scheduleData[date][currentEditState.shiftType]
      ? scheduleData[date][currentEditState.shiftType].employee
      : null;

  availableEmployees.forEach((empId) => {
    const emp = employees[empId];
    const option = document.createElement("div");
    option.className = "edit-option";
    if (empId === currentAssignment) {
      option.classList.add("selected");
      currentEditState.employee = empId;
    }

    option.setAttribute("data-employee", empId);
    option.innerHTML = `
                    <div><strong>${emp.name}</strong></div>
                    <div>(${empId})</div>
                `;

    option.addEventListener("click", function () {
      // 移除其他选项的选中状态
      document
        .querySelectorAll("#employee-options .edit-option")
        .forEach((opt) => {
          opt.classList.remove("selected");
        });

      // 设置当前选项为选中状态
      this.classList.add("selected");
      currentEditState.employee = empId;

      // 验证选择
      validateSelection();
    });

    container.appendChild(option);
  });

  // 添加"清空班次"选项
  const clearOption = document.createElement("div");
  clearOption.className = "edit-option";
  clearOption.innerHTML = `
                <div><strong>清空班次</strong></div>
                <div>不安排員工</div>
            `;

  clearOption.addEventListener("click", function () {
    // 移除其他选项的选中状态
    document
      .querySelectorAll("#employee-options .edit-option")
      .forEach((opt) => {
        opt.classList.remove("selected");
      });

    // 设置当前选项为选中状态
    this.classList.add("selected");
    currentEditState.employee = null;

    // 清除验证消息
    document.getElementById("validation-message").textContent = "";
  });

  container.appendChild(clearOption);

  // 如果有当前安排，验证选择
  if (currentAssignment) {
    validateSelection();
  }
}

// 验证选择
function validateSelection() {
  const messageEl = document.getElementById("validation-message");

  if (!currentEditState.employee) {
    messageEl.textContent = "";
    return;
  }

  const emp = employees[currentEditState.employee];
  const date = currentEditState.date;
  const dateNum = parseInt(date.split("/")[1]);
  const dayOfWeek = new Date(
    currentMonth.year,
    currentMonth.month,
    dateNum
  ).getDay();

  // 检查固定休息日
  if (emp.fixedDaysOff.includes(dayOfWeek)) {
    messageEl.textContent = `⚠️ ${emp.name} 固定休息星期${getDayName(
      dayOfWeek
    )}`;
    return;
  }

  // 检查不可上班日期
  if (emp.unavailableDates.includes(date)) {
    messageEl.textContent = `⚠️ ${emp.name} 在 ${date} 不可上班`;
    return;
  }

  // 检查特殊日期限制
  if (emp.specialDates && emp.specialDates[date]) {
    const allowedShifts = emp.specialDates[date];
    if (
      allowedShifts.length > 0 &&
      !allowedShifts.includes(currentEditState.shiftType)
    ) {
      messageEl.textContent = `⚠️ ${emp.name} 在 ${date} 只能上 ${allowedShifts
        .map((s) => getShiftName(s))
        .join("或")} 班`;
      return;
    }
  }

  // 检查可上班日期（针对兼職D）
  if (emp.availableDates && emp.availableDates.length > 0) {
    if (!emp.availableDates.includes(date)) {
      messageEl.textContent = `⚠️ ${emp.name} 只能在特定日期上班`;
      return;
    }
  }

  // 检查可上班班次
  if (!emp.preferredShifts.includes(currentEditState.shiftType)) {
    messageEl.textContent = `⚠️ ${emp.name} 不偏好上 ${getShiftName(
      currentEditState.shiftType
    )}`;
    return;
  }

  // 正職只能上白天班
  if (emp.type === "fulltime" && currentEditState.shiftType !== "day") {
    messageEl.textContent = `⚠️ 正職員工只能上白天班`;
    return;
  }

  // 检查兼職F的每週晚班限制
  if (
    empId === "F" &&
    currentEditState.shiftType === "night" &&
    emp.maxNightShiftsPerWeek
  ) {
    if (!checkWeeklyNightShiftLimit("F", dateNum)) {
      messageEl.textContent = `⚠️ ${emp.name} 本週已達到晚班上限 (${emp.maxNightShiftsPerWeek}天)`;
      return;
    }
  }

  // 如果通过所有检查
  messageEl.textContent = "✓ 選擇符合規則";
  messageEl.style.color = "green";
}

// 获取星期名称
function getDayName(dayIndex) {
  const days = ["日", "一", "二", "三", "四", "五", "六"];
  return days[dayIndex];
}

// 生成统计信息
function generateStatistics() {
  // 正职员工统计
  const fulltimeStats = document.getElementById("fulltime-stats");
  let fulltimeHTML = "";

  Object.keys(employees).forEach((empId) => {
    const emp = employees[empId];
    if (emp.type === "fulltime") {
      // 计算工作天数和休假天数
      let workDays = 0;
      let offDays = 0;

      const daysInMonth = new Date(
        currentMonth.year,
        currentMonth.month + 1,
        0
      ).getDate();

      for (let date = 1; date <= daysInMonth; date++) {
        const dateStr = `${currentMonth.month + 1}/${date}`;
        const dayOfWeek = new Date(
          currentMonth.year,
          currentMonth.month,
          date
        ).getDay();

        // 检查是否是固定休息日
        const isFixedDayOff = emp.fixedDaysOff.includes(dayOfWeek);
        // 检查是否是额外休息日
        const isExtraDayOff = emp.unavailableDates.includes(dateStr);

        if (isFixedDayOff || isExtraDayOff) {
          offDays++;
        } else {
          workDays++;
        }
      }

      fulltimeHTML += `
                        <div class="mb-2">
                            <span class="employee-badge employee-${empId}">${emp.name}</span>
                            工作天數: ${workDays}天, 休假天數: ${offDays}天
                        </div>
                    `;
    }
  });

  fulltimeStats.innerHTML = fulltimeHTML || "<p>無正職員工</p>";

  // 兼职员工统计
  const parttimeStats = document.getElementById("parttime-stats");
  let parttimeHTML = "";

  Object.keys(employees).forEach((empId) => {
    const emp = employees[empId];
    if (emp.type === "parttime") {
      // 计算班次数和总时数
      let shiftCount = 0;
      let totalHours = 0;
      let holidayHours = 0;

      Object.keys(scheduleData).forEach((dateStr) => {
        Object.keys(scheduleData[dateStr]).forEach((shiftType) => {
          const assignment = scheduleData[dateStr][shiftType];
          if (assignment && assignment.employee === empId) {
            shiftCount++;

            const dateNum = parseInt(dateStr.split("/")[1]);
            const isWeekend =
              new Date(
                currentMonth.year,
                currentMonth.month,
                dateNum
              ).getDay() === 0 ||
              new Date(
                currentMonth.year,
                currentMonth.month,
                dateNum
              ).getDay() === 6;
            let shiftInfo = isWeekend
              ? shiftTimes.weekend[shiftType]
              : shiftTimes.weekday[shiftType];

            // 處理兼職D的特殊班次時間
            if (
              empId === "D" &&
              isWeekend &&
              shiftType === "night" &&
              emp.specialShiftTimes
            ) {
              shiftInfo = emp.specialShiftTimes.weekend.night;
            }

            let hours = shiftInfo.hours;

            // 处理特殊调整
            const monthKey = `${currentMonth.year}-${currentMonth.month + 1}`;
            const specialDates = specialDatesData[monthKey] || {
              holidays: [],
              closed: [],
              adjusted: {},
            };

            if (specialDates.adjusted[dateStr]) {
              // 这里可以根据具体调整修改时数
              // 例如：if (dateStr === '11/17' && shiftType === 'day') { hours = 5; }
            }

            if (specialDates.holidays.includes(dateStr)) {
              holidayHours += hours;
            } else {
              totalHours += hours;
            }
          }
        });
      });

      parttimeHTML += `
                        <div class="mb-2">
                            <span class="employee-badge employee-${empId}">${
        emp.name
      }</span>
                            班次數: ${shiftCount}班, 總時數: ${
        totalHours + holidayHours
      }小時
                            (一般: ${totalHours}小時, 國定: ${holidayHours}小時)
                        </div>
                    `;
    }
  });

  parttimeStats.innerHTML = parttimeHTML || "<p>無兼職員工</p>";
}

// 设置按钮事件
function setupButtonEvents() {
  // 自动生成排班
  document
    .getElementById("auto-generate")
    .addEventListener("click", function () {
      if (confirm("確定要自動生成排班嗎？這將覆蓋現有的排班。")) {
        autoGenerateSchedule();
        generateCalendar();
        alert("排班已自動生成！");
      }
    });

  // 验证班表
  document
    .getElementById("validate-schedule")
    .addEventListener("click", function () {
      validateSchedule();
    });

  // 检查连续上班
  document
    .getElementById("check-continuous")
    .addEventListener("click", function () {
      checkContinuousWork();
    });

  // 导出图片
  document
    .getElementById("export-image")
    .addEventListener("click", function () {
      exportScheduleImage();
    });

  // 保存班表
  document
    .getElementById("save-schedule")
    .addEventListener("click", function () {
      saveSchedule();
    });

  // 载入班表
  document
    .getElementById("load-schedule")
    .addEventListener("click", function () {
      loadSchedule();
    });

  // 新增员工
  document
    .getElementById("add-employee")
    .addEventListener("click", function () {
      addNewEmployee();
    });

  // 保存规则
  document.getElementById("save-rules").addEventListener("click", function () {
    saveEmployeeRules();
  });

  // 保存特殊日期
  document
    .getElementById("save-special")
    .addEventListener("click", function () {
      saveSpecialDates();
    });

  // 编辑模态框按钮
  document.getElementById("cancel-edit").addEventListener("click", function () {
    document.getElementById("edit-modal").style.display = "none";
  });

  document.getElementById("save-edit").addEventListener("click", function () {
    saveEditChanges();
  });

  // 新增月份按钮
  document.getElementById("add-month").addEventListener("click", function () {
    openAddMonthModal();
  });

  document
    .getElementById("cancel-add-month")
    .addEventListener("click", function () {
      document.getElementById("add-month-modal").style.display = "none";
    });

  document
    .getElementById("confirm-add-month")
    .addEventListener("click", function () {
      confirmAddMonth();
    });

  // 特殊日期按钮
  document.getElementById("add-holiday").addEventListener("click", function () {
    addHoliday();
  });

  document.getElementById("add-closed").addEventListener("click", function () {
    addClosed();
  });

  document.getElementById("add-adjust").addEventListener("click", function () {
    addAdjust();
  });

  // 添加星期选择事件
  document.addEventListener("change", function (e) {
    if (e.target.classList.contains("day-checkbox")) {
      const empId = e.target.getAttribute("data-emp");
      const day = parseInt(e.target.getAttribute("data-day"));

      if (e.target.checked) {
        if (!employees[empId].fixedDaysOff.includes(day)) {
          employees[empId].fixedDaysOff.push(day);
        }
      } else {
        employees[empId].fixedDaysOff = employees[empId].fixedDaysOff.filter(
          (d) => d !== day
        );
      }
    }

    if (e.target.classList.contains("shift-checkbox")) {
      const empId = e.target.getAttribute("data-emp");
      const shift = e.target.getAttribute("data-shift");

      if (e.target.checked) {
        if (!employees[empId].preferredShifts.includes(shift)) {
          employees[empId].preferredShifts.push(shift);
        }
      } else {
        employees[empId].preferredShifts = employees[
          empId
        ].preferredShifts.filter((s) => s !== shift);
      }
    }
  });
}

// 保存编辑变更
function saveEditChanges() {
  const date = currentEditState.date;
  const shiftType = currentEditState.shiftType;
  const employee = currentEditState.employee;

  if (!shiftType) {
    alert("請選擇班次");
    return;
  }

  // 初始化该日期的排班数据
  if (!scheduleData[date]) {
    scheduleData[date] = {};
  }

  if (employee) {
    // 设置排班
    scheduleData[date][shiftType] = {
      employee: employee,
    };
  } else {
    // 清空班次
    delete scheduleData[date][shiftType];

    // 如果该日期没有其他班次，删除该日期的数据
    if (Object.keys(scheduleData[date]).length === 0) {
      delete scheduleData[date];
    }
  }

  // 关闭模态框
  document.getElementById("edit-modal").style.display = "none";

  // 更新日历显示
  generateCalendar();

  alert("排班已更新！");
}

// 自动生成排班
function autoGenerateSchedule() {
  // 清空现有排班
  scheduleData = {};

  const daysInMonth = new Date(
    currentMonth.year,
    currentMonth.month + 1,
    0
  ).getDate();

  // 生成该月每一天的排班
  for (let date = 1; date <= daysInMonth; date++) {
    const dateStr = `${currentMonth.month + 1}/${date}`;
    const dayOfWeek = new Date(
      currentMonth.year,
      currentMonth.month,
      date
    ).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 周日或周六

    scheduleData[dateStr] = {};

    // 获取当天的班别需求
    const requirements = isWeekend
      ? staffingRequirements.weekend
      : staffingRequirements.weekday;

    // 为每个班别排班
    Object.keys(requirements).forEach((shiftType) => {
      // 特殊处理：某些日期不需要特定班次
      // 例如：if (dateStr === '11/7' && shiftType === 'night') { return; }

      // 获取可用的员工
      const availableEmployees = getAvailableEmployees(
        dateStr,
        dayOfWeek,
        shiftType
      );

      if (availableEmployees.length > 0) {
        // 根据优先级选择员工
        let selectedEmployee = null;

        // 假日短班优先排E，其次F
        if (isWeekend && shiftType === "short") {
          if (availableEmployees.includes("E")) {
            selectedEmployee = "E";
          } else if (availableEmployees.includes("F")) {
            selectedEmployee = "F";
          } else {
            selectedEmployee = availableEmployees[0];
          }
        }
        // 晚班优先排D（如果他有班），其次C和F
        else if (shiftType === "night") {
          const nightPreferred = availableEmployees.filter((emp) =>
            employees[emp].preferredShifts.includes("night")
          );

          if (nightPreferred.length > 0) {
            // 优先选择D（如果他有班）
            if (nightPreferred.includes("D")) {
              selectedEmployee = "D";
            } else if (nightPreferred.includes("C")) {
              selectedEmployee = "C";
            } else if (nightPreferred.includes("F")) {
              // 检查兼職F的每週晚班限制
              if (checkWeeklyNightShiftLimit("F", date)) {
                selectedEmployee = "F";
              } else {
                // 如果F已达到限制，选择其他可用员工
                const otherEmployees = nightPreferred.filter(
                  (emp) => emp !== "F"
                );
                selectedEmployee =
                  otherEmployees.length > 0 ? otherEmployees[0] : null;
              }
            } else {
              selectedEmployee = nightPreferred[0];
            }
          } else {
            selectedEmployee = availableEmployees[0];
          }
        }
        // 其他情况选择第一个可用员工
        else {
          selectedEmployee = availableEmployees[0];
        }

        if (selectedEmployee) {
          scheduleData[dateStr][shiftType] = {
            employee: selectedEmployee,
          };
        }
      }
    });
  }
}

// 获取可用员工
function getAvailableEmployees(dateStr, dayOfWeek, shiftType) {
  const available = [];

  Object.keys(employees).forEach((empId) => {
    const emp = employees[empId];

    // 检查是否是固定休息日
    if (emp.fixedDaysOff.includes(dayOfWeek)) {
      return;
    }

    // 检查是否是不可上班日期
    if (emp.unavailableDates.includes(dateStr)) {
      return;
    }

    // 检查特殊日期限制
    if (emp.specialDates && emp.specialDates[dateStr]) {
      const allowedShifts = emp.specialDates[dateStr];
      if (allowedShifts.length > 0 && !allowedShifts.includes(shiftType)) {
        return;
      }
    }

    // 检查可上班日期（针对兼職D）
    if (emp.availableDates && emp.availableDates.length > 0) {
      if (!emp.availableDates.includes(dateStr)) {
        return;
      }
    }

    // 检查可上班班次
    if (!emp.preferredShifts.includes(shiftType)) {
      return;
    }

    // 正職只能上白天班
    if (emp.type === "fulltime" && shiftType !== "day") {
      return;
    }

    // 如果通过所有检查，则员工可用
    available.push(empId);
  });

  return available;
}

// 新增函數：檢查兼職F的每週晚班限制
function checkWeeklyNightShiftLimit(empId, date) {
  const emp = employees[empId];
  if (!emp.maxNightShiftsPerWeek) return true; // 如果沒有限制，返回true

  const dateNum = parseInt(date);
  const weekStart = getWeekStartDate(dateNum);
  const weekEnd = weekStart + 6;

  let nightShiftCount = 0;

  // 計算本週已安排的晚班數量
  for (let d = weekStart; d <= weekEnd && d <= 31; d++) {
    const checkDateStr = `${currentMonth.month + 1}/${d}`;
    if (scheduleData[checkDateStr] && scheduleData[checkDateStr]["night"]) {
      if (scheduleData[checkDateStr]["night"].employee === empId) {
        nightShiftCount++;
      }
    }
  }

  return nightShiftCount < emp.maxNightShiftsPerWeek;
}

// 新增函數：獲取週起始日期
function getWeekStartDate(date) {
  const dayOfWeek = new Date(
    currentMonth.year,
    currentMonth.month,
    date
  ).getDay();
  // 週一為起始日
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  return date + mondayOffset;
}

// 验证班表
function validateSchedule() {
  let isValid = true;
  let messages = [];

  const daysInMonth = new Date(
    currentMonth.year,
    currentMonth.month + 1,
    0
  ).getDate();

  // 检查每天的人力需求是否满足
  for (let date = 1; date <= daysInMonth; date++) {
    const dateStr = `${currentMonth.month + 1}/${date}`;
    const dayOfWeek = new Date(
      currentMonth.year,
      currentMonth.month,
      date
    ).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const requirements = isWeekend
      ? staffingRequirements.weekend
      : staffingRequirements.weekday;

    Object.keys(requirements).forEach((shiftType) => {
      // 特殊处理：某些日期不需要特定班次
      // 例如：if (dateStr === '11/7' && shiftType === 'night') { return; }

      const assignment = scheduleData[dateStr]
        ? scheduleData[dateStr][shiftType]
        : null;
      const required = requirements[shiftType];

      if (!assignment && required > 0) {
        isValid = false;
        messages.push(
          `${dateStr} ${getShiftName(shiftType)} 缺少 ${required} 人`
        );
      }
    });
  }

  if (isValid) {
    alert("✓ 班表驗證通過！");
  } else {
    alert("❌ 班表驗證失敗！\n" + messages.join("\n"));
  }
}

// 检查连续上班
function checkContinuousWork() {
  const maxContinuousDays = 5;
  let warnings = [];

  const daysInMonth = new Date(
    currentMonth.year,
    currentMonth.month + 1,
    0
  ).getDate();

  Object.keys(employees).forEach((empId) => {
    let continuousDays = 0;
    let lastWorkDay = null;

    for (let date = 1; date <= daysInMonth; date++) {
      const dateStr = `${currentMonth.month + 1}/${date}`;
      let worked = false;

      // 检查员工今天是否有班
      if (scheduleData[dateStr]) {
        Object.keys(scheduleData[dateStr]).forEach((shiftType) => {
          if (
            scheduleData[dateStr][shiftType] &&
            scheduleData[dateStr][shiftType].employee === empId
          ) {
            worked = true;
          }
        });
      }

      if (worked) {
        continuousDays++;
        lastWorkDay = date;
      } else {
        if (continuousDays > maxContinuousDays) {
          warnings.push(
            `${employees[empId].name} 從 ${currentMonth.month + 1}/${
              lastWorkDay - continuousDays + 1
            } 到 ${
              currentMonth.month + 1
            }/${lastWorkDay} 連續上班 ${continuousDays} 天`
          );
        }
        continuousDays = 0;
      }
    }

    // 检查月末连续上班
    if (continuousDays > maxContinuousDays) {
      warnings.push(
        `${employees[empId].name} 從 ${currentMonth.month + 1}/${
          daysInMonth - continuousDays + 1
        } 到 ${
          currentMonth.month + 1
        }/${daysInMonth} 連續上班 ${continuousDays} 天`
      );
    }
  });

  if (warnings.length > 0) {
    alert("⚠️ 連續上班檢查發現以下問題：\n" + warnings.join("\n"));
  } else {
    alert("✓ 連續上班檢查通過！");
  }
}

// 导出排班表图片
function exportScheduleImage() {
  const element = document.getElementById("schedule");

  html2canvas(element).then((canvas) => {
    const link = document.createElement("a");
    link.download = `${currentMonth.year}年${
      currentMonth.month + 1
    }月排班表.png`;
    link.href = canvas.toDataURL();
    link.click();
  });
}

// 保存班表
function saveSchedule() {
  const monthKey = `${currentMonth.year}-${currentMonth.month + 1}`;
  const scheduleToSave = {
    schedule: scheduleData,
    month: monthKey,
  };

  localStorage.setItem(
    `scheduleData-${monthKey}`,
    JSON.stringify(scheduleToSave)
  );
  alert("班表已儲存！");
}

// 载入班表
function loadSchedule() {
  const monthKey = `${currentMonth.year}-${currentMonth.month + 1}`;
  const savedSchedule = localStorage.getItem(`scheduleData-${monthKey}`);
  if (savedSchedule) {
    const parsed = JSON.parse(savedSchedule);
    scheduleData = parsed.schedule;
    generateCalendar();
    alert("班表已載入！");
  } else {
    alert("沒有儲存的班表！");
  }
}

// 加载指定月份的排班表
function loadScheduleForMonth() {
  const monthKey = `${currentMonth.year}-${currentMonth.month + 1}`;
  const savedSchedule = localStorage.getItem(`scheduleData-${monthKey}`);

  if (savedSchedule) {
    const parsed = JSON.parse(savedSchedule);
    scheduleData = parsed.schedule;
  } else {
    // 如果没有保存的排班表，初始化为空
    scheduleData = {};
  }

  // 加载特殊日期
  loadSpecialDatesForMonth();
}

// 加载指定月份的特殊日期
function loadSpecialDatesForMonth() {
  const monthKey = `${currentMonth.year}-${currentMonth.month + 1}`;
  const savedSpecialDates = localStorage.getItem(`specialDates-${monthKey}`);

  if (savedSpecialDates) {
    specialDatesData[monthKey] = JSON.parse(savedSpecialDates);
  } else {
    // 如果没有保存的特殊日期，初始化为空
    specialDatesData[monthKey] = { holidays: [], closed: [], adjusted: {} };
  }
}

// 新增员工
function addNewEmployee() {
  // 生成新的员工ID
  let newId = "G";
  let counter = 7; // G是第7个字母
  while (employees[newId]) {
    newId = String.fromCharCode(65 + counter); // A=65
    counter++;
  }

  // 添加新员工
  employees[newId] = {
    name: `新員工${newId}`,
    type: "parttime",
    fixedDaysOff: [],
    unavailableDates: [],
    preferredShifts: ["day"],
    color: getRandomColor(),
  };

  // 更新表单
  generateEmployeeRulesForm();
}

// 获取随机颜色
function getRandomColor() {
  const colors = [
    "#ffc0cb",
    "#ace9ac",
    "#f4dd6d",
    "#4db3f3",
    "#b9aaf5",
    "#ffc080",
    "#FFB6C1",
    "#98FB98",
    "#FFFACD",
    "#87CEFA",
    "#DDA0DD",
    "#FFA07A",
  ];
  return colors[Math.floor(Math.random() * colors.length)];
}

// 保存员工规则
function saveEmployeeRules() {
  localStorage.setItem("employeeData", JSON.stringify(employees));
  alert("員工規則已儲存！");
}

// 保存特殊日期
function saveSpecialDates() {
  const specialMonthSelect = document.getElementById("special-month-select");
  const monthKey = specialMonthSelect.value;

  if (!monthKey) {
    alert("請選擇月份！");
    return;
  }

  localStorage.setItem(
    `specialDates-${monthKey}`,
    JSON.stringify(specialDatesData[monthKey])
  );
  alert("特殊日期已儲存！");
}

// 打开新增月份模态框
function openAddMonthModal() {
  // 生成年份选项
  const yearSelect = document.getElementById("new-year");
  yearSelect.innerHTML = "";

  const currentYear = new Date().getFullYear();
  for (let i = currentYear - 1; i <= currentYear + 2; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.textContent = `${i}年`;
    if (i === currentYear) {
      option.selected = true;
    }
    yearSelect.appendChild(option);
  }

  // 显示模态框
  document.getElementById("add-month-modal").style.display = "flex";
}

// 确认新增月份
function confirmAddMonth() {
  const year = parseInt(document.getElementById("new-year").value);
  const month = parseInt(document.getElementById("new-month").value);
  const monthKey = `${year}-${month + 1}`;

  // 检查是否已存在该月份
  const monthSelect = document.getElementById("month-select");
  const specialMonthSelect = document.getElementById("special-month-select");

  for (let i = 0; i < monthSelect.options.length; i++) {
    if (monthSelect.options[i].value === monthKey) {
      alert("該月份已存在！");
      return;
    }
  }

  // 添加月份选项
  const monthName = `${year}年${month + 1}月`;
  addMonthOption(monthSelect, monthKey, monthName);
  addMonthOption(specialMonthSelect, monthKey, monthName);

  // 设置当前月份为新添加的月份
  monthSelect.value = monthKey;
  specialMonthSelect.value = monthKey;
  currentMonth = { year: year, month: month };

  // 加载新月份的排班表
  loadScheduleForMonth();
  generateCalendar();

  // 关闭模态框
  document.getElementById("add-month-modal").style.display = "none";

  alert(`已新增 ${monthName} 排班表！`);
}

// 更新特殊日期显示
function updateSpecialDatesDisplay() {
  const specialMonthSelect = document.getElementById("special-month-select");
  const monthKey = specialMonthSelect.value;

  if (!monthKey) {
    return;
  }

  // 确保特殊日期数据存在
  if (!specialDatesData[monthKey]) {
    specialDatesData[monthKey] = { holidays: [], closed: [], adjusted: {} };
  }

  const specialDates = specialDatesData[monthKey];

  // 更新国定假日显示
  const holidaysList = document.getElementById("holidays-list");
  if (specialDates.holidays.length > 0) {
    holidaysList.innerHTML = specialDates.holidays
      .map(
        (holiday) =>
          `<div class="mb-1">${holiday} <button class="btn btn-sm btn-outline-danger ms-2 remove-holiday" data-date="${holiday}">移除</button></div>`
      )
      .join("");
  } else {
    holidaysList.innerHTML = '<p class="text-muted">本月無國定假日</p>';
  }

  // 更新公休日显示
  const closedList = document.getElementById("closed-list");
  if (specialDates.closed.length > 0) {
    closedList.innerHTML = specialDates.closed
      .map(
        (closed) =>
          `<div class="mb-1">${closed} <button class="btn btn-sm btn-outline-danger ms-2 remove-closed" data-date="${closed}">移除</button></div>`
      )
      .join("");
  } else {
    closedList.innerHTML = '<p class="text-muted">本月無全天公休</p>';
  }

  // 更新调整营业时段显示
  const adjustedList = document.getElementById("adjusted-list");
  if (Object.keys(specialDates.adjusted).length > 0) {
    adjustedList.innerHTML = Object.keys(specialDates.adjusted)
      .map(
        (date) =>
          `<div class="mb-1">${date}：${specialDates.adjusted[date]} <button class="btn btn-sm btn-outline-danger ms-2 remove-adjust" data-date="${date}">移除</button></div>`
      )
      .join("");
  } else {
    adjustedList.innerHTML = '<p class="text-muted">本月無調整營業時段</p>';
  }

  // 添加移除按钮事件
  document.querySelectorAll(".remove-holiday").forEach((button) => {
    button.addEventListener("click", function () {
      const date = this.getAttribute("data-date");
      removeHoliday(date);
    });
  });

  document.querySelectorAll(".remove-closed").forEach((button) => {
    button.addEventListener("click", function () {
      const date = this.getAttribute("data-date");
      removeClosed(date);
    });
  });

  document.querySelectorAll(".remove-adjust").forEach((button) => {
    button.addEventListener("click", function () {
      const date = this.getAttribute("data-date");
      removeAdjust(date);
    });
  });
}

// 添加国定假日
function addHoliday() {
  const dateInput = document.getElementById("new-holiday");
  const date = dateInput.value.trim();

  if (!date) {
    alert("請輸入日期！");
    return;
  }

  const specialMonthSelect = document.getElementById("special-month-select");
  const monthKey = specialMonthSelect.value;

  if (!specialDatesData[monthKey]) {
    specialDatesData[monthKey] = { holidays: [], closed: [], adjusted: {} };
  }

  if (!specialDatesData[monthKey].holidays.includes(date)) {
    specialDatesData[monthKey].holidays.push(date);
    dateInput.value = "";
    updateSpecialDatesDisplay();
  } else {
    alert("該日期已是國定假日！");
  }
}

// 移除国定假日
function removeHoliday(date) {
  const specialMonthSelect = document.getElementById("special-month-select");
  const monthKey = specialMonthSelect.value;

  if (specialDatesData[monthKey]) {
    specialDatesData[monthKey].holidays = specialDatesData[
      monthKey
    ].holidays.filter((d) => d !== date);
    updateSpecialDatesDisplay();
  }
}

// 添加公休日
function addClosed() {
  const dateInput = document.getElementById("new-closed");
  const date = dateInput.value.trim();

  if (!date) {
    alert("請輸入日期！");
    return;
  }

  const specialMonthSelect = document.getElementById("special-month-select");
  const monthKey = specialMonthSelect.value;

  if (!specialDatesData[monthKey]) {
    specialDatesData[monthKey] = { holidays: [], closed: [], adjusted: {} };
  }

  if (!specialDatesData[monthKey].closed.includes(date)) {
    specialDatesData[monthKey].closed.push(date);
    dateInput.value = "";
    updateSpecialDatesDisplay();
  } else {
    alert("該日期已是公休日！");
  }
}

// 移除公休日
function removeClosed(date) {
  const specialMonthSelect = document.getElementById("special-month-select");
  const monthKey = specialMonthSelect.value;

  if (specialDatesData[monthKey]) {
    specialDatesData[monthKey].closed = specialDatesData[
      monthKey
    ].closed.filter((d) => d !== date);
    updateSpecialDatesDisplay();
  }
}

// 添加调整营业时段
function addAdjust() {
  const dateInput = document.getElementById("new-adjust-date");
  const descInput = document.getElementById("new-adjust-desc");
  const date = dateInput.value.trim();
  const desc = descInput.value.trim();

  if (!date || !desc) {
    alert("請輸入日期和調整說明！");
    return;
  }

  const specialMonthSelect = document.getElementById("special-month-select");
  const monthKey = specialMonthSelect.value;

  if (!specialDatesData[monthKey]) {
    specialDatesData[monthKey] = { holidays: [], closed: [], adjusted: {} };
  }

  specialDatesData[monthKey].adjusted[date] = desc;
  dateInput.value = "";
  descInput.value = "";
  updateSpecialDatesDisplay();
}

// 移除调整营业时段
function removeAdjust(date) {
  const specialMonthSelect = document.getElementById("special-month-select");
  const monthKey = specialMonthSelect.value;

  if (specialDatesData[monthKey] && specialDatesData[monthKey].adjusted[date]) {
    delete specialDatesData[monthKey].adjusted[date];
    updateSpecialDatesDisplay();
  }
}

// 加载保存的数据
function loadSavedData() {
  // 加载员工数据
  const savedEmployees = localStorage.getItem("employeeData");
  if (savedEmployees) {
    employees = JSON.parse(savedEmployees);
    generateEmployeeRulesForm();
  }

  // 加载当前月份的特殊日期
  loadSpecialDatesForMonth();

  // 加载当前月份的排班表
  loadScheduleForMonth();
}
