import produce from "immer";

const temp = produce((draft) => {
  draft.a += 1;

  return { a: 4, b: 2 };
});

const Page = () => {
  const t = temp({ a: 1 });

  return (
    <div>
      A: {t.a} B: {t.b}
      {JSON.stringify(t)}
    </div>
  );
};

export default Page;
