import {GetterTree} from "vuex";
import {Course, State} from "./state";
import {RootState} from "~/store";

export const getters: GetterTree<State, RootState> = {
    getCourses: (state: State) => {
        if (state.courses === null) {
            return null;
        }
        return state.courses;
    },
    getCoursesForDate: (state: State, _: any, rootState: RootState, rootGetters: any) => {
        return (date: Date): Array<Course> => {
            if (state.courses === null) {
                return [];
            }
            console.log(rootGetters['semester/getSemesterForDate'](rootState.semesters));
            return state.courses.filter((course: Course) => {
                for (let time of course.time) {
                    if (time.day === date.getDay()) {
                        return true;
                    }
                }
                return false;
            });
        }
    }
};