import React, { useState, useMemo, useCallback } from 'react';
import { getBudgetAnalysis, getEstimatedNetIncome } from './services/geminiService';
import type { Expense } from './types';

const App: React.FC = () => {
    const [grossIncome, setGrossIncome] = useState<string>('');
    const [filingStatus, setFilingStatus] = useState<string>('Single');
    const [location, setLocation] = useState<string>('');
    const [expenses, setExpenses] = useState<Expense[]>([
        { id: Date.now(), name: 'Rent/Mortgage', amount: '' },
    ]);

    const [netIncome, setNetIncome] = useState<number | null>(null);
    const [estimatedTax, setEstimatedTax] = useState<number | null>(null);
    const [taxDisclaimer, setTaxDisclaimer] = useState<string>('');
    const [analysis, setAnalysis] = useState<string>('');
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [loadingStatus, setLoadingStatus] = useState<string>('');
    const [error, setError] = useState<string | null>(null);
    const [showResults, setShowResults] = useState<boolean>(false);

    const handleAddExpense = useCallback(() => {
        setExpenses(prevExpenses => [...prevExpenses, { id: Date.now(), name: '', amount: '' }]);
    }, []);

    const handleRemoveExpense = useCallback((id: number) => {
        setExpenses(prevExpenses => prevExpenses.filter(expense => expense.id !== id));
    }, []);

    const handleExpenseChange = useCallback((id: number, field: 'name' | 'amount', value: string) => {
        setExpenses(prevExpenses =>
            prevExpenses.map(expense =>
                expense.id === id ? { ...expense, [field]: value } : expense
            )
        );
    }, []);

    const { totalExpenses, isFormValid } = useMemo(() => {
        const numericGrossIncome = parseFloat(grossIncome);
        const validExpenses = expenses.filter(e => e.name.trim() !== '' && e.amount.trim() !== '' && !isNaN(parseFloat(e.amount)));
        
        const total = validExpenses.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        
        const formValid = !isNaN(numericGrossIncome) && numericGrossIncome > 0 && location.trim() !== '';

        return {
            totalExpenses: total,
            isFormValid: formValid
        };
    }, [grossIncome, expenses, location]);
    
    const remainingBalance = useMemo(() => {
        if (netIncome === null) return null;
        return netIncome - totalExpenses;
    }, [netIncome, totalExpenses]);

    const handleCalculate = async () => {
        if (!isFormValid) {
            setError('Please fill in your gross income, location, and at least one valid expense.');
            return;
        }

        setError(null);
        setIsLoading(true);
        setShowResults(true);
        setAnalysis('');
        setNetIncome(null);
        setEstimatedTax(null);

        try {
            setLoadingStatus('Estimating your taxes...');
            const taxResult = await getEstimatedNetIncome(
                parseFloat(grossIncome),
                location,
                filingStatus
            );
            setNetIncome(taxResult.netIncome);
            setEstimatedTax(taxResult.totalTax);
            setTaxDisclaimer(taxResult.disclaimer);

            setLoadingStatus('Analyzing your budget...');
            const finalRemainingBalance = taxResult.netIncome - totalExpenses;
            const validExpenses = expenses.filter(e => e.name.trim() !== '' && e.amount.trim() !== '');
            const analysisResult = await getBudgetAnalysis(
                parseFloat(grossIncome),
                taxResult.netIncome,
                location,
                validExpenses,
                totalExpenses,
                finalRemainingBalance
            );
            setAnalysis(analysisResult);
        } catch (err) {
            setError('An error occurred during analysis. Please check your inputs and try again.');
            console.error(err);
            setShowResults(false);
        } finally {
            setIsLoading(false);
            setLoadingStatus('');
        }
    };

    const currencyFormatter = new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
    });

    const getBalanceColor = (balance: number | null) => {
        if (balance === null) return 'text-gray-700';
        if (balance > 0) return 'text-green-500';
        if (balance < 0) return 'text-red-500';
        return 'text-gray-700';
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans text-slate-800 flex flex-col items-center p-4 sm:p-6 md:p-8">
            <div className="w-full max-w-4xl mx-auto">
                <header className="text-center mb-8">
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 tracking-tight">AI Monthly Budget Analyzer</h1>
                    <p className="mt-2 text-lg text-slate-600">Understand your finances with the power of AI.</p>
                </header>

                <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200">
                        <h2 className="text-2xl font-semibold mb-6 border-b pb-3">Your Financial Details</h2>
                        
                        <div className="space-y-6">
                            <div>
                                <label htmlFor="income" className="block text-sm font-medium text-slate-700 mb-1">Gross Monthly Income</label>
                                <div className="relative">
                                    <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
                                    <input
                                        type="number"
                                        id="income"
                                        value={grossIncome}
                                        onChange={(e) => setGrossIncome(e.target.value)}
                                        placeholder="5000"
                                        className="w-full pl-7 pr-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    />
                                </div>
                            </div>
                             <div>
                                <label htmlFor="filingStatus" className="block text-sm font-medium text-slate-700 mb-1">Filing Status</label>
                                <select
                                    id="filingStatus"
                                    value={filingStatus}
                                    onChange={(e) => setFilingStatus(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition bg-white"
                                >
                                    <option>Single</option>
                                    <option>Married Filing Jointly</option>
                                    <option>Married Filing Separately</option>
                                    <option>Head of Household</option>
                                </select>
                            </div>
                            <div>
                                <label htmlFor="location" className="block text-sm font-medium text-slate-700 mb-1">Where do you live?</label>
                                <input
                                    type="text"
                                    id="location"
                                    value={location}
                                    onChange={(e) => setLocation(e.target.value)}
                                    placeholder="e.g., San Francisco, CA"
                                    className="w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                />
                            </div>
                        </div>

                        <h3 className="text-xl font-semibold mt-8 mb-4 border-b pb-3">Monthly Expenses</h3>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2">
                            {expenses.map((expense, index) => (
                                <div key={expense.id} className="flex items-center gap-2 animate-fade-in">
                                    <input
                                        type="text"
                                        value={expense.name}
                                        onChange={(e) => handleExpenseChange(expense.id, 'name', e.target.value)}
                                        placeholder={`Expense ${index + 1}`}
                                        className="flex-grow px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                    />
                                    <div className="relative">
                                         <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-500">$</span>
                                        <input
                                            type="number"
                                            value={expense.amount}
                                            onChange={(e) => handleExpenseChange(expense.id, 'amount', e.target.value)}
                                            placeholder="500"
                                            className="w-32 pl-7 pr-2 py-2 border border-slate-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                                        />
                                    </div>
                                    <button
                                        onClick={() => handleRemoveExpense(expense.id)}
                                        className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-100 rounded-full transition-colors"
                                        aria-label="Remove expense"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm4 0a1 1 0 012 0v6a1 1 0 11-2 0V8z" clipRule="evenodd" /></svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                         <button
                            onClick={handleAddExpense}
                            className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                        >
                             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
                            Add Expense
                        </button>
                         <div className="mt-8 border-t pt-6">
                            <button
                                onClick={handleCalculate}
                                disabled={!isFormValid || isLoading}
                                className="w-full px-6 py-3 text-lg font-semibold text-white bg-blue-600 rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed transition-all duration-300"
                            >
                                {isLoading ? loadingStatus : 'Calculate & Analyze'}
                            </button>
                            {error && <p className="text-red-500 text-sm mt-2 text-center">{error}</p>}
                        </div>

                    </div>
                    <div className="bg-white p-6 sm:p-8 rounded-2xl shadow-lg border border-slate-200">
                        <h2 className="text-2xl font-semibold mb-6 border-b pb-3">Your Financial Summary</h2>
                        {showResults ? (
                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="font-medium text-slate-600">Gross Monthly Income</p>
                                        <p className="text-lg font-bold text-slate-800">{currencyFormatter.format(parseFloat(grossIncome) || 0)}</p>
                                    </div>
                                    <div className="p-3 bg-slate-50 rounded-lg">
                                        <p className="font-medium text-slate-600">Estimated Taxes</p>
                                        <p className="text-lg font-bold text-slate-800">{estimatedTax !== null ? currencyFormatter.format(estimatedTax) : '...'}</p>
                                    </div>
                                </div>
                                 <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                    <p className="text-sm font-medium text-blue-800">Estimated Net Income</p>
                                    <p className="text-2xl font-bold text-blue-900">{netIncome !== null ? currencyFormatter.format(netIncome) : '...'}</p>
                                </div>
                                <div className="p-4 bg-slate-100 rounded-lg">
                                    <p className="text-sm font-medium text-slate-600">Total Monthly Expenses</p>
                                    <p className="text-2xl font-bold text-slate-800">{currencyFormatter.format(totalExpenses)}</p>
                                </div>
                                <div className="p-4 bg-slate-100 rounded-lg">
                                    <p className="text-sm font-medium text-slate-600">Remaining Balance</p>
                                    <p className={`text-3xl font-bold ${getBalanceColor(remainingBalance)}`}>{remainingBalance !== null ? currencyFormatter.format(remainingBalance) : '...'}</p>
                                </div>
                                <div className="pt-4">
                                    <h3 className="text-xl font-semibold mb-3 flex items-center gap-2">
                                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                        AI-Powered Analysis
                                    </h3>
                                    {isLoading && loadingStatus === 'Analyzing your budget...' ? (
                                        <div className="space-y-2 animate-pulse">
                                            <div className="h-4 bg-slate-200 rounded w-full"></div>
                                            <div className="h-4 bg-slate-200 rounded w-5/6"></div>
                                            <div className="h-4 bg-slate-200 rounded w-3/4"></div>
                                        </div>
                                    ) : (
                                        <div className="prose prose-slate max-w-none text-slate-700 whitespace-pre-wrap">
                                            {analysis || "Your personalized financial tips will appear here."}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500 p-8 bg-slate-50 rounded-lg">
                                 <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}><path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                                <p className="text-lg font-medium">Your budget summary will appear here.</p>
                                <p className="text-sm">Fill out your details and let our AI provide insights!</p>
                            </div>
                        )}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default App;
