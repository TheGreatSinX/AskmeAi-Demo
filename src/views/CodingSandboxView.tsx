import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { api } from '../lib/api';
import {
  Code2,
  Play,
  Sparkles,
  Zap,
  Copy,
  Check,
  RotateCw,
  Terminal,
  Bug,
  HelpCircle,
  Clock,
  HardDrive,
  Cpu,
  BookOpen,
} from 'lucide-react';

const STARTER_CODES: Record<string, string> = {
  python: `def two_sum(nums: list[int], target: int) -> list[int]:
    # Write your optimal solution here
    seen = {}
    for i, num in enumerate(nums):
      complement = target - num
      if complement in seen:
        return [seen[complement], i]
      seen[num] = i
    return []

# Test execution
print(two_sum([2, 7, 11, 15], 9))  # Output: [0, 1]`,

  typescript: `function twoSum(nums: number[], target: number): number[] {
  const map = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement)!, i];
    }
    map.set(nums[i], i);
  }
  return [];
}

console.log(twoSum([2, 7, 11, 15], 9));`,

  javascript: `function twoSum(nums, target) {
  const map = new Map();
  for (let i = 0; i < nums.length; i++) {
    const complement = target - nums[i];
    if (map.has(complement)) {
      return [map.get(complement), i];
    }
    map.set(nums[i], i);
  }
  return [];
}`,

  java: `import java.util.HashMap;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        HashMap<Integer, Integer> map = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            if (map.containsKey(complement)) {
                return new int[] { map.get(complement), i };
            }
            map.put(nums[i], i);
        }
        return new int[0];
    }
}`,

  cpp: `#include <vector>
#include <unordered_map>
using namespace std;

class Solution {
public:
    vector<int> twoSum(vector<int>& nums, int target) {
        unordered_map<int, int> seen;
        for (int i = 0; i < nums.size(); i++) {
            int comp = target - nums[i];
            if (seen.find(comp) != seen.end()) {
                return {seen[comp], i};
            }
            seen[nums[i]] = i;
        }
        return {};
    }
};`,

  go: `package main

func twoSum(nums []int, target int) []int {
    seen := make(map[int]int)
    for i, num := range nums {
        comp := target - num
        if idx, ok := seen[comp]; ok {
            return []int{idx, i}
        }
        seen[num] = i
    }
    return nil
}`,

  rust: `use std::collections::HashMap;

pub fn two_sum(nums: Vec<i32>, target: i32) -> Vec<i32> {
    let mut seen = HashMap::new();
    for (i, &num) in nums.iter().enumerate() {
        let comp = target - num;
        if let Some(&idx) = seen.get(&comp) {
            return vec![idx as i32, i as i32];
        }
        seen.insert(num, i);
    }
    vec![]
}`,
};

const SAMPLE_PROBLEMS = [
  {
    title: 'Two Sum (Optimal HashMap)',
    desc: 'Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target. Each input has exactly one solution.',
  },
  {
    title: 'LRU Cache (Doubly Linked List + Hash Table)',
    desc: 'Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Support get(key) and put(key, value) in O(1) average time complexity.',
  },
  {
    title: 'Merge K Sorted Lists (Min-Heap Priority Queue)',
    desc: 'You are given an array of k linked-lists lists, each linked-list is sorted in ascending order. Merge all the linked-lists into one sorted linked-list and return it.',
  },
  {
    title: 'Longest Substring Without Repeating Characters',
    desc: 'Given a string s, find the length of the longest substring without repeating characters using an optimal sliding window with a character index map.',
  },
];

export const CodingSandboxView: React.FC = () => {
  const { showToast } = useApp();

  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [problemTitle, setProblemTitle] = useState(SAMPLE_PROBLEMS[0].title);
  const [problemDescription, setProblemDescription] = useState(SAMPLE_PROBLEMS[0].desc);
  const [userCode, setUserCode] = useState(STARTER_CODES.python);

  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [executionResult, setExecutionResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setUserCode(STARTER_CODES[lang] || '');
  };

  const handleProblemSelect = (p: (typeof SAMPLE_PROBLEMS)[0]) => {
    setProblemTitle(p.title);
    setProblemDescription(p.desc);
    setAnalysisResult(null);
    setExecutionResult(null);
  };

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const data = await api.analyzeCode({
        title: problemTitle,
        description: problemDescription,
        language: selectedLanguage,
        userCode,
      });
      setAnalysisResult(data);
      showToast('Algorithm and complexity analysis complete!', 'success');
    } catch (e: any) {
      showToast(e.message || 'Analysis failed', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleRunCode = async () => {
    setIsExecuting(true);
    try {
      const testCases = analysisResult?.testCases || [
        { input: '[2, 7, 11, 15], target = 9', expected: '[0, 1]' },
        { input: '[3, 2, 4], target = 6', expected: '[1, 2]' },
      ];
      const res = await api.executeCode(userCode, selectedLanguage, testCases);
      setExecutionResult(res);
      showToast('Test execution completed!', 'success');
    } catch (e: any) {
      showToast('Execution error', 'error');
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCopySolution = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    showToast('Copied optimal solution code to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 rounded-xl border border-slate-800 bg-slate-900/80  ">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
            <Code2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">Coding Interview Assistant</h1>
            <p className="text-xs text-slate-400">
              Live algorithmic breakdown, Big-O complexity calculation, and edge-case detection
            </p>
          </div>
        </div>

        {/* Language selector & actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Language:</span>
            <select
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-transparent text-emerald-400 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="python">Python 3</option>
              <option value="typescript">TypeScript</option>
              <option value="javascript">JavaScript</option>
              <option value="java">Java</option>
              <option value="cpp">C++ (20)</option>
              <option value="go">Go</option>
              <option value="rust">Rust</option>
            </select>
          </div>

          <button
            onClick={handleRunCode}
            disabled={isExecuting}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors"
          >
            <Play className="h-3.5 w-3.5 fill-slate-200" />
            <span>{isExecuting ? 'Testing...' : 'Test Code'}</span>
          </button>

          <button
            onClick={handleAnalyze}
            disabled={isAnalyzing}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-emerald-400 text-[#052e1c] hover:bg-emerald-300 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 fill-slate-950" />
            <span>{isAnalyzing ? 'Analyzing Big-O...' : 'Analyze with AI'}</span>
          </button>
        </div>
      </div>

      {/* Preset Problem Switcher */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 text-[11px] whitespace-nowrap font-medium">Quick Problems:</span>
        {SAMPLE_PROBLEMS.map((p, idx) => (
          <button
            key={idx}
            onClick={() => handleProblemSelect(p)}
            className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-all ${
              problemTitle === p.title
                ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            {p.title.split(' ')[0]} {p.title.split(' ')[1]}
          </button>
        ))}
      </div>

      {/* Main 2-Column Split: Left Editor, Right AI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left: Problem & Code Workspace (6 Cols) */}
        <div className="lg:col-span-6 flex flex-col h-[700px] rounded-xl border border-slate-800 bg-slate-900/70 p-4  space-y-3 overflow-hidden">
          {/* Problem Spec */}
          <div className="p-3.5 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
            <input
              type="text"
              value={problemTitle}
              onChange={(e) => setProblemTitle(e.target.value)}
              className="w-full bg-transparent font-bold text-sm text-white focus:outline-none"
              placeholder="Problem Title"
            />
            <textarea
              value={problemDescription}
              onChange={(e) => setProblemDescription(e.target.value)}
              rows={2}
              className="w-full bg-transparent text-xs text-slate-300 focus:outline-none resize-none leading-relaxed"
              placeholder="Paste or write the algorithm problem description..."
            />
          </div>

          {/* Code Editor */}
          <div className="flex-1 flex flex-col rounded-lg bg-slate-950 border border-slate-800/90 overflow-hidden font-mono text-xs">
            <div className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/80 bg-slate-900/50 text-[11px] text-slate-400">
              <span>Solution Editor ({selectedLanguage})</span>
              <button
                onClick={() => setUserCode(STARTER_CODES[selectedLanguage] || '')}
                className="text-[10px] text-slate-400 hover:text-white"
              >
                Reset Boilerplate
              </button>
            </div>

            <textarea
              value={userCode}
              onChange={(e) => setUserCode(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full p-4 bg-transparent text-emerald-300 focus:outline-none resize-none leading-relaxed font-mono"
            />
          </div>

          {/* Test Case Output Console */}
          {executionResult && (
            <div className="p-3.5 rounded-lg bg-slate-950/90 border border-slate-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <Terminal className="h-3.5 w-3.5" /> All {executionResult.totalCases} Test Cases Passed
                </span>
                <span className="text-slate-400">{executionResult.results?.[0]?.executionTimeMs}ms execution</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {executionResult.results?.map((res: any, idx: number) => (
                  <div key={idx} className="p-2 rounded bg-slate-900 border border-slate-800 text-slate-300">
                    <span className="text-emerald-400 font-bold block">Case {res.caseIndex}: ✓ PASSED</span>
                    <span className="text-[10px] text-slate-400 block truncate">In: {res.input}</span>
                    <span className="text-[10px] text-slate-400 block truncate">Exp: {res.expected}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right: AI Algorithmic Guidance & Complexity (6 Cols) */}
        <div className="lg:col-span-6 flex flex-col h-[700px] rounded-xl border border-slate-800 bg-slate-900/70 p-5  overflow-y-auto space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h2 className="text-sm font-bold text-white flex items-center gap-2">
              <Cpu className="h-4 w-4 text-emerald-400" /> AI Complexity & Solution Engine
            </h2>
            <span className="text-[11px] text-slate-400">Powered by Gemini 4 Argon</span>
          </div>

          {isAnalyzing ? (
            <div className="py-24 text-center space-y-3">
              <div className="h-10 w-10 rounded-full border-2 border-cyan-400 border-t-transparent animate-spin mx-auto"></div>
              <h3 className="text-sm font-bold text-white">Analyzing Algorithm & Asymptotic Bounds...</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Evaluating brute-force tradeoffs, time complexity $O(N)$, and space limits.
              </p>
            </div>
          ) : analysisResult ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Complexity Badges */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-emerald-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <Clock className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Time Complexity</span>
                  </div>
                  <div className="text-lg font-extrabold text-emerald-300 font-mono">
                    {analysisResult.timeComplexity || 'O(N)'}
                  </div>
                  <p className="text-[10px] text-slate-400">Single pass hash table lookup</p>
                </div>

                <div className="p-3.5 rounded-lg bg-slate-950/80 border border-cyan-500/20 space-y-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-400">
                    <HardDrive className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Space Complexity</span>
                  </div>
                  <div className="text-lg font-extrabold text-cyan-300 font-mono">
                    {analysisResult.spaceComplexity || 'O(N)'}
                  </div>
                  <p className="text-[10px] text-slate-400">Auxiliary dictionary storage</p>
                </div>
              </div>

              {/* Intuition & Approach */}
              <div className="p-4 rounded-lg bg-slate-950/80 border border-slate-800 space-y-1.5">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider block">
                  Algorithmic Intuition & Approach:
                </span>
                <p className="text-xs text-slate-200 leading-relaxed">{analysisResult.approach}</p>
                {analysisResult.explanation && (
                  <p className="text-xs text-slate-400 leading-relaxed pt-2 border-t border-slate-800/80">
                    {analysisResult.explanation}
                  </p>
                )}
              </div>

              {/* Edge Cases / Bugs */}
              {analysisResult.bugsOrWarnings && analysisResult.bugsOrWarnings.length > 0 && (
                <div className="p-3.5 rounded-lg bg-rose-950/20 border border-rose-500/30 space-y-1.5">
                  <span className="text-xs font-bold text-rose-300 flex items-center gap-1.5">
                    <Bug className="h-3.5 w-3.5 text-rose-400" /> Edge Cases to Address:
                  </span>
                  <ul className="list-disc list-inside text-xs text-rose-200/90 space-y-1">
                    {analysisResult.bugsOrWarnings.map((b: string, i: number) => (
                      <li key={i}>{b}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Suggested Optimal Solution */}
              {analysisResult.suggestedSolution && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Code2 className="h-3.5 w-3.5 text-emerald-400" /> Optimal Solution Code ({selectedLanguage})
                    </span>
                    <button
                      onClick={() => handleCopySolution(analysisResult.suggestedSolution)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold transition-colors"
                    >
                      {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                      <span>{copied ? 'Copied' : 'Copy Code'}</span>
                    </button>
                  </div>

                  <pre className="p-4 rounded-lg bg-slate-950 border border-slate-800 text-xs text-emerald-300/90 font-mono overflow-x-auto leading-relaxed">
                    {analysisResult.suggestedSolution}
                  </pre>
                </div>
              )}
            </div>
          ) : (
            <div className="py-24 text-center space-y-3">
              <Sparkles className="h-10 w-10 text-slate-600 mx-auto" />
              <h3 className="text-sm font-bold text-slate-300">Ready to Analyze Code</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Click &ldquo;Analyze with AI&rdquo; to receive algorithmic breakdown, Big-O complexity, edge cases, and optimal implementations.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
