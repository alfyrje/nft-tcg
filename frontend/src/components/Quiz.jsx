import React, {useEffect, useState} from 'react';
import axios from 'axios';
export default function Quiz({address}){
    const [questions, setQuestions] = useState([]);
    const [answers, setAnswers] = useState({});
    const [result, setResult] = useState(null);
    useEffect(()=>{ fetch(); },[]);
    async function fetch(){ const r = await axios.get('http://localhost:4000/quiz'); setQuestions(r.data.results || []); }
    function select(qIdx, ans){ setAnswers({...answers, [qIdx]: ans}); }
    async function submit(){
        const payload = { address, results: questions.map((q,idx)=>({ question: q.question, correct_answer: q.correct_answer, user_answer: answers[idx] })) };
        const r = await axios.post('http://localhost:4000/quiz/submit', payload);
        setResult(r.data);
    }
    return (<div>
        <h2>Daily Quiz</h2>
        {questions.map((q,idx)=> (<div key={idx} className="card">
            <div dangerouslySetInnerHTML={{__html:q.question}} />
            {([...q.incorrect_answers, q.correct_answer].sort()).map((a,ai)=>(<div key={ai}><label><input type="radio" name={'q'+idx} onChange={()=>select(idx,a)} /> <span dangerouslySetInnerHTML={{__html:a}}/></label></div>))}
        </div>))}
        <div><button onClick={submit}>Submit Answers</button></div>
        {result && <pre>{JSON.stringify(result,null,2)}</pre>}
    </div>);
}
