import {Cookie} from 'tough-cookie';
import {postFormWithCookies} from '../../../infrastructure/request';
import * as Cheerio from 'cheerio';
import {CourseTime, CourseTimeService} from "../../../../../shared/model/course/courseTime/courseTime";
import {CourseRepository} from "../../../model/course/course";
import {XmlEntities} from "html-entities";
import {TeacherRepository} from "../../../model/teacher/teacher";
import {Course} from "../../../../../shared/model/course/course";
import {SemesterRepository} from "../../../model/semester/semester";

const entities = new XmlEntities();

/**
 * 下载课程页面
 */
export function fetchCoursePage(studentId: string, cookies: Array<Cookie>): Promise<string> {
    return postFormWithCookies(cookies, 'http://xk.autoisp.shu.edu.cn/StudentQuery/CtrlViewQueryCourseTable', {
        studentNo: process.env.STUDENT_ID
    });
}

/**
 * 从课程页面中读取学生名字
 */
export function getStudentNameFromPage(coursePage: string) {
    let $ = Cheerio.load(coursePage);
    return $("#showStudent td div:nth-of-type(2)").text().trim().slice(3).trim();
}

export async function parseCourseTimes(str: string): Promise<Array<CourseTime>> {
    const regex = /[一二三四五六日]\d+-\d+([^一二三四五]*)/gm;
    let result = new Array<CourseTime>();
    let match;
    do {
        match = regex.exec(str);
        if (match !== null) {
            result.push(CourseTimeService.fromString(match[0]));
        }
    } while (match !== null);
    return result;
}

async function parseCourse(cols: Array<string>): Promise<Course> {
    const id = cols[1];
    let result = await CourseRepository.getById(cols[1]);
    if (result !== null) {
        return result;
    }
    const name = cols[2];
    const hasManyTeacher = cols[4][cols[4].length - 1] === '等';
    const teacher = await TeacherRepository.getOrCreateByName(hasManyTeacher ? cols[4].slice(0, -1) : cols[4]);
    const semester = await SemesterRepository.current();
    const courseTimes = await parseCourseTimes(cols[6]);
    const place = await cols[7];
    return {
        id: id,
        name: name,
        teacherId: teacher._id,
        semesterId: semester._id,
        times: courseTimes,
        place: place
    };
}

/**
 * 从课程页面中解析出课程
 * @param coursePage
 */
export async function getCoursesFromPage(coursePage: string): Promise<Array<Course>> {
    const $ = Cheerio.load(coursePage, {ignoreWhitespace: true});
    const rows = $(".tbllist tr");
    let courses: Array<Course> = [];
    for (let i = 3; ; ++i) {
        const row = $(rows[i]);
        let cols = [];
        row.find('td').each((_, element: CheerioElement) => {
            cols.push(entities.decode($(element).html().trim()));
        });
        if (cols.length !== 11) {
            break;
        }
        let course = await parseCourse(cols);
        await CourseRepository.save(course);
        courses.push(course);
    }
    return courses;
}