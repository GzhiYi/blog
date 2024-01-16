const fs = require('fs')
const dayjs = require('dayjs')

function getPostsData() {
  const posts = fs.readdirSync('./_posts')
  const postData = {}
  posts.forEach(postName => {
    if (/md/g.test(postName)) {
      const postDate = postName.slice(0, 10)
      const postTitle = postName.slice(11, -3)
      let oldData = postData[postDate]
      if (!oldData) oldData = []
      oldData.push(postTitle)
      postData[`${postDate}`] = oldData
    }
  })
  return postData
}
/**
 * @description return current year every day in array
 */
function getCurrentYearDateArr() {
  // 需要增加八小时
  const lastDate = dayjs().add(8, 'hours').format('YYYY-MM-DD')
  const dateArr = []
  for (let i = 370; i >= 0; i--) {
    const date = dayjs(lastDate).subtract(i, 'day').format('YYYY-MM-DD')
    dateArr.push(date)
  }
  return dateArr
}

function dataLevel(length) {
  return length >= 4 ? 4 : length
}

function generateCalendar() {
  let svg = ''
  const dateArr = getCurrentYearDateArr()
  const posts = getPostsData()
  const dateSlice = []
  let weekSvg = ''
  const monthLabelData = []
  const firstDateWeek = new Date(dateArr[0]).toLocaleString(
    'default', { weekday: 'long' }
  )
  const mapWeekNum = {
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
    Sunday: 7
  }
  const mapWeekLabel = {
    1: '周一',
    2: '周二',
    3: '周三',
    4: '周四',
    5: '周五',
    6: '周六',
    7: '周日'
  }
  const firstDateWeekNum = mapWeekNum[firstDateWeek]
  for (let i = 0; i < dateArr.length; i+= 7) {
    const chunk = dateArr.slice(i, i + 7)
    dateSlice.push(chunk)
  }
  dateSlice.forEach((week, weekIndex) => {
    let daySvg = ''
    week.forEach((date, dateIndex) => {
      const postLength = posts[date] ? posts[date].length : 0
      daySvg += `
        <rect
          class="rect-item"
          width="10"
          height="10"
          x="${14 - weekIndex}"
          y="${dateIndex * 13}"
          data-level="${dataLevel(postLength)}"
          data-count="${postLength}"
          data-date="${date}"
        ></rect>
      `
      if (date.slice(-2) === '01') {
        monthLabelData.push({
          date: date,
          label: dayjs(date).format('MM月'),
          weekIndex: weekIndex
        })
      }
    })
    weekSvg += `
      <g transform="translate(${14 * weekIndex}, 0)">${daySvg}</g>
    `
  })
  let monthLabel = ''
  monthLabelData.forEach(({ date, label, weekIndex }) => {
    const fitOneNum = date.slice(5, 7)[0] !== '0' ? 3 : 0
    monthLabel += `
      <text
      x="${40 + 14 * weekIndex - weekIndex - fitOneNum}"
      y="-7"
      data-windex="${weekIndex}"
      data-date="${date}"
      class="month-label"
      >${label}</text>
    `
  })
  const fmtWeekLabel = weekNum => {
    if (weekNum > 7) weekNum = weekNum - 7
    return mapWeekLabel[weekNum]
  }
  return `
    <svg width="730" height="121" class="graph">
      <g transform="translate(15, 20)">
        ${weekSvg}
        ${monthLabel}
        <text class="week-label" dx="10" dy="21.5">${ fmtWeekLabel(firstDateWeekNum + 1) }</text>
        <text class="week-label" dx="10" dy="47.5">${ fmtWeekLabel(firstDateWeekNum + 3) }</text>
        <text class="week-label" dx="10" dy="74.5">${ fmtWeekLabel(firstDateWeekNum + 5) }</text>
      </g>
    </svg>
    <div
      class="svg-tip"
      style="pointer-events: none;"
    >
    </div>
  `
}

function renderSvg() {
  // get about file
  let aboutFile = fs.readFileSync('./about.html', 'utf8')
  const svg = generateCalendar(getPostsData())
  aboutFile = aboutFile.replace('<!-- heatmap -->', svg)
  fs.writeFileSync('./about.html', aboutFile)
}

renderSvg()
