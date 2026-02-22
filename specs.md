# Chain Rule Seater
An app that can display and edit a seating chart for a class of students.
## high level description of the UI:
* canvas (takes up most of the screen), displaying each table at its respective location
* right bar, showing the list of friend groups and the full list of students (both collapsible, and having unlimited height when uncollapsed). use colored highlighting to indicate the students' state (at a locked seat, at an unlocked seat, or unseated)
* top bar (see features section below)
### top level attributes:
* name
* teacher
* list of students (initialized by a roster text file)
* list of tables
* list of friend groups
### features:
* top bar contains these components in order:
    * name of chart
    * buttons:
        * add n tables of size m (prompt the user for each)
        * lock all seats
        * unlock all seats
        * randomize unlocked seats (internally i'm calling it Random Fill)
        * clear all unlocked seats
    * buttons (right aligned):
        * reset roster
        * save: write all attributes/data, including roster, to a JSON file
        * load: initialize all attributes from a JSON file
* right bar:
    * right bar can be resized horizontally. have loose limits on how far it can stretch/shrink.
    * add a friend group
    * rename a student in the roster (only doable in the student list)
* canvas:
    * zoom in/out
    * pan around by scrolling or dragging on empty space

---
Here are descriptions of each element/data structure and its features:
## friend group
a group of students who want to be at the same table. groups are not allowed to overlap.
### attributes:
the list of students. max capacity of a friend group is 6, matching table capacity.
### features:
* add/remove a student in the friend group
* remove a friend group from the list

## table
contains 2-6 seats (seats are defined later).
### display:
* rectangle with fixed height and variable width depending on its capacity.
    * distribute the seats at its top and bottom edges within the rectangle, so that the outer rectangle encloses each seat.
    * (For example, a 5-person table will display 3 seats at the top and 2 seats at the bottom. With this rule, the configuration of seats at a table is predetermined for any possible size of the table, so it does not need to be stored.)
### attributes:
* capacity (2 to 6)
* list of seats in order
* x, y (position in the chart)
### features:
* cursor becomes a hand when hovering over a table or seat
* drag a table around to change its position within the canvas
* right click on a table (not on a seat) to open this menu:
    * lock all seats in a table
    * unlock all seats in a table
    * remove a table from the chart
    * edit table's capacity: prompt the user for new capacity. (if capacity decreases, remove the students from the deleted seats)

## seat
a spot at the table. if a student occupies the seat, display their name there.
### attributes:
* occupying student, or null if empty
* locked (boolean)
### features:
* click on a seat to toggle the lock. pressing and releasing without moving the mouse constitutes as clicking. treat it as dragging if and only if the mouse moves while holding click.
* drag a student from the roster to an unlocked seat. if the seat already contains a student, remove that student from the seat and place the selected student.
* drag a student from one seat to another unlocked seat (the start and end seats don't have to be at the same table.) if the destination seat has a student there, swap the two students. if it's empty, then just move the student and leave the original seat empty.
* drag a student from one seat to a blank spot on the canvas to remove them from that seat.

## student
a student unique to this chart.
### attributes:
* name
* unique id (not given. assign them internally)

## Additionally, implement a feature called Random Fill:
Prerequisite: the number of unlocked seats is equal to the number of students that aren't in locked seats
1. Remove all students from unlocked seats.
2. For each friend group (iterate by descending group size) that already has a member seated, seat as many of the other members as possible into the same table. leave the rest unseated.
3. For each remaining friend group (iterate by descending group size), choose a random table with enough available seats to fit all friends, and place all friends at that table. if no such table exists, choose the table with the largest number of available seats and fit as many friends as possible at that table. leave the rest unseated.
4. Place all remaining students randomly into remaining unlocked empty seats.

---

Build this app using a modern React and TypeScript stack with Vite, Tailwind CSS for styling, Zustand for global state management, React-Konva for the interactive drag-and-drop canvas, and Lucide-React for iconography.