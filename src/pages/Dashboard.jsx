import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [courses, setCourses] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [newCourse, setNewCourse] = useState({ title: '', description: '', startDate: '' });
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [courseStudents, setCourseStudents] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user'));
    if (!storedUser) {
      navigate('/');
    } else {
      setUser(storedUser);
      fetchCourses();
      if (storedUser.role === 'STUDENT') {
        fetchMyEnrollments();
      }
    }
  }, [navigate]);

  const fetchCourses = async () => {
    try {
      const { data } = await api.get('/courses');
      setCourses(data);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMyEnrollments = async () => {
    try {
      const { data } = await api.get('/enrollments/my-enrollments');
      setMyEnrollments(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateCourse = async (e) => {
    e.preventDefault();
    try {
      await api.post('/courses', newCourse);
      setMsg('Course created successfully!');
      setNewCourse({ title: '', description: '', startDate: '' });
      fetchCourses();
    } catch (err) {
      setError(err.response?.data?.message || 'Error creating course');
    }
  };

  const handleEnroll = async (courseId) => {
    try {
      setError('');
      setMsg('');
      await api.post('/enrollments', { courseId });
      setMsg('Successfully enrolled in the course!');
      fetchMyEnrollments();
    } catch (err) {
      setError(err.response?.data?.message || 'Enrollment failed');
    }
  };

  const viewStudents = async (courseId) => {
    try {
      const { data } = await api.get(`/enrollments/course/${courseId}/students`);
      setCourseStudents({ ...courseStudents, [courseId]: data });
    } catch (err) {
      console.error(err);
    }
  };

  const logout = () => {
    localStorage.removeItem('user');
    navigate('/');
  };

  if (!user) return null;

  return (
    <div>
      <nav className="navbar">
        <div className="nav-brand">EduManage</div>
        <div className="nav-links">
          <span>Welcome, <strong>{user.name}</strong> ({user.role})</span>
          <button onClick={logout} className="btn btn-secondary">Logout</button>
        </div>
      </nav>

      <div className="container mt-2 fade-in">
        {error && <div className="card mb-2" style={{ borderColor: 'var(--danger)' }}><p className="text-danger">{error}</p></div>}
        {msg && <div className="card mb-2" style={{ borderColor: 'var(--secondary)' }}><p style={{ color: 'var(--secondary)' }}>{msg}</p></div>}

        {user.role === 'INSTRUCTOR' && (
          <div>
            <h2>Create New Course</h2>
            <div className="card mb-2">
              <form onSubmit={handleCreateCourse} className="grid">
                <div className="form-group">
                  <label>Title</label>
                  <input type="text" className="form-control" value={newCourse.title} onChange={e => setNewCourse({...newCourse, title: e.target.value})} required />
                </div>
                <div className="form-group">
                  <label>Start Date</label>
                  <input type="date" className="form-control" value={newCourse.startDate} onChange={e => setNewCourse({...newCourse, startDate: e.target.value})} required />
                </div>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Description</label>
                  <textarea className="form-control" value={newCourse.description} onChange={e => setNewCourse({...newCourse, description: e.target.value})} required rows="3"></textarea>
                </div>
                <button type="submit" className="btn">Create Course</button>
              </form>
            </div>

            <h2>My Courses</h2>
            <div className="grid">
              {courses.filter(c => c.instructor._id === user._id || c.instructor === user._id).map(course => (
                <div key={course._id} className="card">
                  <h3>{course.title}</h3>
                  <p className="mt-1">{course.description}</p>
                  <p className="mt-1"><strong>Start Date:</strong> {new Date(course.startDate).toLocaleDateString()}</p>
                  <button onClick={() => viewStudents(course._id)} className="btn btn-secondary mt-1">View Enrolled Students</button>
                  
                  {courseStudents[course._id] && (
                    <div className="mt-1">
                      <h4>Enrolled:</h4>
                      {courseStudents[course._id].length === 0 ? <p>No students yet.</p> : (
                        <ul style={{ paddingLeft: '1.5rem', marginTop: '0.5rem', color: 'var(--text-muted)' }}>
                          {courseStudents[course._id].map(enr => (
                            <li key={enr._id}>{enr.student.name} ({enr.student.email})</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {user.role === 'STUDENT' && (
          <div>
            <h2>Available Courses</h2>
            <div className="grid mb-2">
              {courses.map(course => {
                const isEnrolled = myEnrollments.some(e => e.course._id === course._id);
                const isClosed = new Date() > new Date(course.startDate);
                
                return (
                  <div key={course._id} className="card">
                    <h3>{course.title}</h3>
                    <p className="mt-1">{course.description}</p>
                    <p className="mt-1 mb-1">
                      <strong>Start Date:</strong> {new Date(course.startDate).toLocaleDateString()}<br/>
                      <strong>Instructor:</strong> {course.instructor?.name || 'Unknown'}
                    </p>
                    
                    {isEnrolled ? (
                      <span className="badge badge-secondary">Enrolled</span>
                    ) : isClosed ? (
                      <span className="badge badge-danger">Enrollment Closed</span>
                    ) : (
                      <button onClick={() => handleEnroll(course._id)} className="btn">Enroll Now</button>
                    )}
                  </div>
                )
              })}
            </div>

            <h2>My Enrollments</h2>
            <div className="grid">
              {myEnrollments.map(enr => (
                <div key={enr._id} className="card" style={{ borderLeft: '4px solid var(--secondary)' }}>
                  <h3>{enr.course.title}</h3>
                  <p className="mt-1"><strong>Enrolled On:</strong> {new Date(enr.enrollmentDate).toLocaleDateString()}</p>
                  <span className="badge badge-secondary mt-1">Active</span>
                </div>
              ))}
              {myEnrollments.length === 0 && <p>You haven't enrolled in any courses yet.</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
